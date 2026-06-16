// Emails transactionnels via Resend (REST API, cote serveur uniquement).
// Ne jamais importer ce module dans un composant client : il lit RESEND_API_KEY.
import {
  COULEUR_LABELS,
  FINITION_LABELS,
  DELAI_LABELS,
  NATURE_LABELS,
  labelOf,
  formatEUR,
} from "./cart";

// Expediteur configurable par variable d'env (Vercel). IMPORTANT : tant qu'il
// vaut le sandbox "onboarding@resend.dev", Resend ne livre qu'a l'adresse du
// proprietaire du compte Resend (mode test) ; aucune notification n'arrive a
// 3Dprinting@oneortho-medical.com. Pour livrer reellement : verifier un domaine
// sur resend.com/domains, puis definir RESEND_FROM (ex. "ONE PRINT
// <noreply@oneortho-medical.com>") dans les variables d'environnement.
export const EMAIL_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
export const INTERNAL_EMAIL = "3Dprinting@oneortho-medical.com";

export type EmailPiece = {
  nom_fichier: string;
  quantite: number;
  finition: string | null;
  couleur: string | null;
  volume_mm3: number | null;
};

export type EmailOrder = {
  numero: string;
  natureApplication: string | null;
  delai: string | null;
  montantHt: number;
  tva: number;
  montantTtc: number;
  pieces: EmailPiece[];
};

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Cle absente : on ne bloque pas le flux metier (envoi best-effort).
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      const error = `Resend ${res.status}: ${detail.slice(0, 300)}`;
      // Echec non bloquant mais visible : sinon un 403 (domaine non verifie)
      // passe totalement inapercu.
      console.error("sendEmail failed", { to: params.to, error });
      return { ok: false, error };
    }
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "send failed";
    console.error("sendEmail error", { to: params.to, error });
    return { ok: false, error };
  }
}

// ---------- Templates ----------

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F5F2E8;font-family:Arial,Helvetica,sans-serif;color:#1C1C1A;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#004B32;border-radius:14px 14px 0 0;padding:20px 24px;">
      <div style="font-weight:700;font-size:20px;color:#fff;letter-spacing:-.02em;">ONE <span style="color:#FF6C4F;">PRINT</span></div>
      <div style="font-size:12px;color:rgba(170,230,110,.9);margin-top:3px;">OneOrtho Medical — Impression 3D SLS PA2200</div>
    </div>
    <div style="background:#fff;border-radius:0 0 14px 14px;padding:24px;">
      <h1 style="font-size:18px;color:#004B32;margin:0 0 14px;">${escapeHtml(title)}</h1>
      ${body}
    </div>
    <p style="font-size:11px;color:#8A8478;text-align:center;margin:16px 0 0;line-height:1.5;">
      Devis indicatif HT, sous réserve de validation technique. Paiement à réception de facture.<br>
      OneOrtho Medical — Parc Inopolis, 206 route de Vourles, 69230 Saint-Genis-Laval — 3Dprinting@oneortho-medical.com
    </p>
  </div></body></html>`;
}

function piecesTable(pieces: EmailPiece[]): string {
  const rows = pieces
    .map(
      (p) => `<tr>
      <td style="padding:8px 10px;border-top:1px solid #F0ECE0;font-size:13px;">${escapeHtml(
        p.nom_fichier
      )}</td>
      <td style="padding:8px 10px;border-top:1px solid #F0ECE0;font-size:12.5px;color:#8A8478;">PA2200 · ${escapeHtml(
        labelOf(COULEUR_LABELS, p.couleur)
      )} · ${escapeHtml(labelOf(FINITION_LABELS, p.finition))}</td>
      <td style="padding:8px 10px;border-top:1px solid #F0ECE0;font-size:13px;text-align:center;">${
        p.volume_mm3 != null ? Math.round(p.volume_mm3).toLocaleString("fr-FR") + " mm³" : "—"
      }</td>
      <td style="padding:8px 10px;border-top:1px solid #F0ECE0;font-size:13px;text-align:center;">×${
        p.quantite
      }</td>
    </tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:6px 0 2px;">
    <tr>
      <th style="text-align:left;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:.04em;padding:0 10px 4px;">Fichier</th>
      <th style="text-align:left;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:.04em;padding:0 10px 4px;">Options</th>
      <th style="text-align:center;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:.04em;padding:0 10px 4px;">Volume</th>
      <th style="text-align:center;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:.04em;padding:0 10px 4px;">Qté</th>
    </tr>
    ${rows}
  </table>`;
}

function orderBlock(order: EmailOrder): string {
  return `<div style="border:1px solid #E2DED2;border-radius:12px;padding:14px 16px;margin:0 0 14px;">
    <div style="font-weight:700;font-size:14px;color:#004B32;">Devis ${escapeHtml(
      order.numero
    )}</div>
    <div style="font-size:12.5px;color:#8A8478;margin:2px 0 8px;">${escapeHtml(
      labelOf(NATURE_LABELS, order.natureApplication)
    )} · ${escapeHtml(labelOf(DELAI_LABELS, order.delai))}</div>
    ${piecesTable(order.pieces)}
    <div style="text-align:right;font-size:13px;margin-top:8px;">
      Total HT : <strong>${formatEUR(order.montantHt)}</strong> · TVA : ${formatEUR(
    order.tva
  )} · <strong style="color:#004B32;">${formatEUR(order.montantTtc)} TTC</strong>
    </div>
  </div>`;
}

export function clientConfirmationHtml(
  clientName: string,
  orders: EmailOrder[]
): string {
  const total = orders.reduce((s, o) => s + o.montantTtc, 0);
  return shell(
    "Votre demande de production est confirmée",
    `<p style="font-size:14px;line-height:1.6;">Bonjour ${escapeHtml(
      clientName
    )},</p>
     <p style="font-size:14px;line-height:1.6;">Nous avons bien reçu votre demande. Notre équipe la valide sous 24 h et vous recontacte. Récapitulatif :</p>
     ${orders.map(orderBlock).join("")}
     <p style="font-size:14px;line-height:1.6;margin-top:4px;">Montant total : <strong style="color:#004B32;">${formatEUR(
       total
     )} TTC</strong></p>
     <p style="font-size:13px;color:#8A8478;line-height:1.6;">Vous pouvez suivre l'avancement dans votre espace client ONE PRINT.</p>`
  );
}

export function internalNotificationHtml(
  client: { raison_sociale: string | null; email: string | null; telephone: string | null },
  orders: EmailOrder[]
): string {
  const total = orders.reduce((s, o) => s + o.montantTtc, 0);
  return shell(
    "Nouvelle commande à traiter",
    `<div style="background:#F0F7EC;border:1px solid #AAE66E;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:13.5px;">
       <strong>${escapeHtml(client.raison_sociale ?? "Client")}</strong><br>
       ${escapeHtml(client.email ?? "—")}${client.telephone ? " · " + escapeHtml(client.telephone) : ""}
     </div>
     ${orders.map(orderBlock).join("")}
     <p style="font-size:14px;">Total : <strong style="color:#004B32;">${formatEUR(
       total
     )} TTC</strong> · ${orders.length} devis</p>`
  );
}

export const STATUT_EMAIL: Record<
  string,
  { label: string; message: string } | undefined
> = {
  en_production: {
    label: "en production",
    message:
      "Bonne nouvelle : votre commande est maintenant en production. Nos équipes impriment vos pièces en PA2200.",
  },
  expediee: {
    label: "expédiée",
    message:
      "Votre commande a été expédiée. Vous la recevrez à l'adresse de livraison indiquée.",
  },
  livree: {
    label: "livrée",
    message: "Votre commande a été livrée. Merci de votre confiance.",
  },
};

export function statusUpdateHtml(
  clientName: string,
  numero: string,
  statut: string
): string {
  const info = STATUT_EMAIL[statut];
  const label = info?.label ?? statut;
  return shell(
    `Votre commande ${numero} : ${label}`,
    `<p style="font-size:14px;line-height:1.6;">Bonjour ${escapeHtml(
      clientName
    )},</p>
     <p style="font-size:14px;line-height:1.6;">${escapeHtml(
       info?.message ?? "Le statut de votre commande a été mis à jour."
     )}</p>
     <div style="background:#F0F7EC;border:1px solid #AAE66E;border-radius:10px;padding:12px 14px;margin-top:12px;font-size:14px;">
       Commande <strong>${escapeHtml(numero)}</strong> — statut : <strong style="color:#004B32;">${escapeHtml(
    label
  )}</strong>
     </div>
     <p style="font-size:13px;color:#8A8478;line-height:1.6;margin-top:14px;">Suivez le détail dans votre espace client ONE PRINT.</p>`
  );
}
