// Emails transactionnels via Resend (REST API, cote serveur uniquement).
// Ne jamais importer ce module dans un composant client : il lit RESEND_API_KEY.
import { formatEUR } from "./cart";
import { isLang, translate, type Lang } from "./i18n/messages";

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

// Langue des emails client : celle choisie au moment du devis (devis.langue).
// Les notifications internes restent en francais.
export function emailLang(value: string | null | undefined): Lang {
  return isLang(value ?? null) ? (value as Lang) : "fr";
}

// Chaines specifiques aux emails (les libelles partages — couleurs, finitions,
// delais, nature, statuts — viennent du dictionnaire i18n de l'app).
type EmailDict = {
  confirmSubject: string;
  confirmTitle: string;
  hello: string;
  confirmIntro: string;
  totalLabel: string;
  follow: string;
  thFile: string;
  thOptions: string;
  thVolume: string;
  thQty: string;
  quote: string;
  totalHt: string;
  vat: string;
  statusSubject: string;
  statusTitle: string;
  statusFallback: string;
  statusLine: string;
  status: string;
  footer: string;
  statusMsg: Record<string, string>;
};

const EMAIL_I18N: Record<Lang, EmailDict> = {
  fr: {
    confirmSubject: "Votre demande de production ONE PRINT est confirmée",
    confirmTitle: "Votre demande de production est confirmée",
    hello: "Bonjour {name},",
    confirmIntro:
      "Nous avons bien reçu votre demande. Notre équipe la valide sous 24 h et vous recontacte. Récapitulatif :",
    totalLabel: "Montant total :",
    follow: "Vous pouvez suivre l'avancement dans votre espace client ONE PRINT.",
    thFile: "Fichier",
    thOptions: "Options",
    thVolume: "Volume",
    thQty: "Qté",
    quote: "Devis",
    totalHt: "Total HT",
    vat: "TVA",
    statusSubject: "Votre commande {numero} — {label}",
    statusTitle: "Votre commande {numero} : {label}",
    statusFallback: "Le statut de votre commande a été mis à jour.",
    statusLine: "Commande",
    status: "statut",
    footer:
      "Devis indicatif HT, sous réserve de validation technique. Paiement à réception de facture.",
    statusMsg: {
      en_production:
        "Bonne nouvelle : votre commande est maintenant en production. Nos équipes impriment vos pièces en PA2200.",
      expediee:
        "Votre commande a été expédiée. Vous la recevrez à l'adresse de livraison indiquée.",
      livree: "Votre commande a été livrée. Merci de votre confiance.",
    },
  },
  en: {
    confirmSubject: "Your ONE PRINT production request is confirmed",
    confirmTitle: "Your production request is confirmed",
    hello: "Hello {name},",
    confirmIntro:
      "We have received your request. Our team validates it within 24 h and will get back to you. Summary:",
    totalLabel: "Total amount:",
    follow: "You can track progress in your ONE PRINT customer area.",
    thFile: "File",
    thOptions: "Options",
    thVolume: "Volume",
    thQty: "Qty",
    quote: "Quote",
    totalHt: "Total excl. VAT",
    vat: "VAT",
    statusSubject: "Your order {numero} — {label}",
    statusTitle: "Your order {numero}: {label}",
    statusFallback: "The status of your order has been updated.",
    statusLine: "Order",
    status: "status",
    footer:
      "Indicative quote excl. VAT, subject to technical validation. Payment on receipt of invoice.",
    statusMsg: {
      en_production:
        "Good news: your order is now in production. Our teams are printing your parts in PA2200.",
      expediee:
        "Your order has been shipped. You will receive it at the delivery address provided.",
      livree: "Your order has been delivered. Thank you for your trust.",
    },
  },
  es: {
    confirmSubject: "Su solicitud de producción ONE PRINT está confirmada",
    confirmTitle: "Su solicitud de producción está confirmada",
    hello: "Hola {name}:",
    confirmIntro:
      "Hemos recibido su solicitud. Nuestro equipo la valida en 24 h y se pondrá en contacto con usted. Resumen:",
    totalLabel: "Importe total:",
    follow: "Puede seguir el avance en su espacio cliente ONE PRINT.",
    thFile: "Archivo",
    thOptions: "Opciones",
    thVolume: "Volumen",
    thQty: "Cant.",
    quote: "Presupuesto",
    totalHt: "Total sin IVA",
    vat: "IVA",
    statusSubject: "Su pedido {numero} — {label}",
    statusTitle: "Su pedido {numero}: {label}",
    statusFallback: "El estado de su pedido ha sido actualizado.",
    statusLine: "Pedido",
    status: "estado",
    footer:
      "Presupuesto indicativo sin IVA, sujeto a validación técnica. Pago a la recepción de la factura.",
    statusMsg: {
      en_production:
        "Buenas noticias: su pedido está ahora en producción. Nuestros equipos imprimen sus piezas en PA2200.",
      expediee:
        "Su pedido ha sido enviado. Lo recibirá en la dirección de entrega indicada.",
      livree: "Su pedido ha sido entregado. Gracias por su confianza.",
    },
  },
  it: {
    confirmSubject: "La tua richiesta di produzione ONE PRINT è confermata",
    confirmTitle: "La tua richiesta di produzione è confermata",
    hello: "Buongiorno {name},",
    confirmIntro:
      "Abbiamo ricevuto la tua richiesta. Il nostro team la convalida entro 24 h e ti ricontatta. Riepilogo:",
    totalLabel: "Importo totale:",
    follow: "Puoi seguire l'avanzamento nella tua area clienti ONE PRINT.",
    thFile: "File",
    thOptions: "Opzioni",
    thVolume: "Volume",
    thQty: "Qtà",
    quote: "Preventivo",
    totalHt: "Totale IVA escl.",
    vat: "IVA",
    statusSubject: "Il tuo ordine {numero} — {label}",
    statusTitle: "Il tuo ordine {numero}: {label}",
    statusFallback: "Lo stato del tuo ordine è stato aggiornato.",
    statusLine: "Ordine",
    status: "stato",
    footer:
      "Preventivo indicativo IVA escl., soggetto a convalida tecnica. Pagamento alla ricezione della fattura.",
    statusMsg: {
      en_production:
        "Buone notizie: il tuo ordine è ora in produzione. I nostri team stampano i tuoi pezzi in PA2200.",
      expediee:
        "Il tuo ordine è stato spedito. Lo riceverai all'indirizzo di consegna indicato.",
      livree: "Il tuo ordine è stato consegnato. Grazie per la fiducia.",
    },
  },
  de: {
    confirmSubject: "Ihre ONE PRINT Produktionsanfrage ist bestätigt",
    confirmTitle: "Ihre Produktionsanfrage ist bestätigt",
    hello: "Guten Tag {name},",
    confirmIntro:
      "Wir haben Ihre Anfrage erhalten. Unser Team prüft sie innerhalb von 24 Std. und meldet sich bei Ihnen. Übersicht:",
    totalLabel: "Gesamtbetrag:",
    follow: "Sie können den Fortschritt in Ihrem ONE PRINT Kundenbereich verfolgen.",
    thFile: "Datei",
    thOptions: "Optionen",
    thVolume: "Volumen",
    thQty: "Menge",
    quote: "Angebot",
    totalHt: "Gesamt netto",
    vat: "MwSt.",
    statusSubject: "Ihre Bestellung {numero} — {label}",
    statusTitle: "Ihre Bestellung {numero}: {label}",
    statusFallback: "Der Status Ihrer Bestellung wurde aktualisiert.",
    statusLine: "Bestellung",
    status: "Status",
    footer:
      "Richtpreisangebot netto, vorbehaltlich technischer Prüfung. Zahlung bei Rechnungserhalt.",
    statusMsg: {
      en_production:
        "Gute Nachrichten: Ihre Bestellung ist jetzt in Fertigung. Unsere Teams drucken Ihre Teile in PA2200.",
      expediee:
        "Ihre Bestellung wurde versendet. Sie erhalten sie an der angegebenen Lieferadresse.",
      livree: "Ihre Bestellung wurde geliefert. Vielen Dank für Ihr Vertrauen.",
    },
  },
  pt: {
    confirmSubject: "O seu pedido de produção ONE PRINT está confirmado",
    confirmTitle: "O seu pedido de produção está confirmado",
    hello: "Olá {name},",
    confirmIntro:
      "Recebemos o seu pedido. A nossa equipa valida-o em 24 h e entra em contacto consigo. Resumo:",
    totalLabel: "Montante total:",
    follow: "Pode acompanhar o progresso no seu espaço cliente ONE PRINT.",
    thFile: "Ficheiro",
    thOptions: "Opções",
    thVolume: "Volume",
    thQty: "Qtd.",
    quote: "Orçamento",
    totalHt: "Total s/ IVA",
    vat: "IVA",
    statusSubject: "A sua encomenda {numero} — {label}",
    statusTitle: "A sua encomenda {numero}: {label}",
    statusFallback: "O estado da sua encomenda foi atualizado.",
    statusLine: "Encomenda",
    status: "estado",
    footer:
      "Orçamento indicativo s/ IVA, sujeito a validação técnica. Pagamento contra fatura.",
    statusMsg: {
      en_production:
        "Boas notícias: a sua encomenda está agora em produção. As nossas equipas imprimem as suas peças em PA2200.",
      expediee:
        "A sua encomenda foi expedida. Irá recebê-la na morada de entrega indicada.",
      livree: "A sua encomenda foi entregue. Obrigado pela sua confiança.",
    },
  },
};

function fill(s: string, vars: Record<string, string>): string {
  let out = s;
  for (const k of Object.keys(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
  }
  return out;
}

// Libelle traduit d'une option de piece/devis (cle i18n de l'app).
function optLabel(lang: Lang, prefix: string, key: string | null): string {
  return key ? translate(lang, `${prefix}.${key}`) : "—";
}

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

function shell(title: string, body: string, lang: Lang = "fr"): string {
  const d = EMAIL_I18N[lang];
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#F5F2E8;font-family:Arial,Helvetica,sans-serif;color:#1C1C1A;">
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
      ${escapeHtml(d.footer)}<br>
      OneOrtho Medical — Parc Inopolis, 206 route de Vourles, 69230 Saint-Genis-Laval — 3Dprinting@oneortho-medical.com
    </p>
  </div></body></html>`;
}

function piecesTable(pieces: EmailPiece[], lang: Lang): string {
  const d = EMAIL_I18N[lang];
  const rows = pieces
    .map(
      (p) => `<tr>
      <td style="padding:8px 10px;border-top:1px solid #F0ECE0;font-size:13px;">${escapeHtml(
        p.nom_fichier
      )}</td>
      <td style="padding:8px 10px;border-top:1px solid #F0ECE0;font-size:12.5px;color:#8A8478;">PA2200 · ${escapeHtml(
        optLabel(lang, "couleur", p.couleur)
      )} · ${escapeHtml(optLabel(lang, "finition", p.finition))}</td>
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
      <th style="text-align:left;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:.04em;padding:0 10px 4px;">${escapeHtml(d.thFile)}</th>
      <th style="text-align:left;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:.04em;padding:0 10px 4px;">${escapeHtml(d.thOptions)}</th>
      <th style="text-align:center;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:.04em;padding:0 10px 4px;">${escapeHtml(d.thVolume)}</th>
      <th style="text-align:center;font-size:11px;color:#8A8478;text-transform:uppercase;letter-spacing:.04em;padding:0 10px 4px;">${escapeHtml(d.thQty)}</th>
    </tr>
    ${rows}
  </table>`;
}

function orderBlock(order: EmailOrder, lang: Lang): string {
  const d = EMAIL_I18N[lang];
  return `<div style="border:1px solid #E2DED2;border-radius:12px;padding:14px 16px;margin:0 0 14px;">
    <div style="font-weight:700;font-size:14px;color:#004B32;">${escapeHtml(
      d.quote
    )} ${escapeHtml(order.numero)}</div>
    <div style="font-size:12.5px;color:#8A8478;margin:2px 0 8px;">${escapeHtml(
      optLabel(lang, "nature", order.natureApplication)
    )} · ${escapeHtml(optLabel(lang, "delai", order.delai))}</div>
    ${piecesTable(order.pieces, lang)}
    <div style="text-align:right;font-size:13px;margin-top:8px;">
      ${escapeHtml(d.totalHt)} : <strong>${formatEUR(order.montantHt)}</strong> · ${escapeHtml(
    d.vat
  )} : ${formatEUR(order.tva)} · <strong style="color:#004B32;">${formatEUR(
    order.montantTtc
  )} ${escapeHtml(translate(lang, "common.ttc"))}</strong>
    </div>
  </div>`;
}

export function confirmSubject(lang: Lang): string {
  return EMAIL_I18N[lang].confirmSubject;
}

export function clientConfirmationHtml(
  clientName: string,
  orders: EmailOrder[],
  lang: Lang = "fr"
): string {
  const d = EMAIL_I18N[lang];
  const total = orders.reduce((s, o) => s + o.montantTtc, 0);
  return shell(
    d.confirmTitle,
    `<p style="font-size:14px;line-height:1.6;">${fill(escapeHtml(d.hello), {
      name: escapeHtml(clientName),
    })}</p>
     <p style="font-size:14px;line-height:1.6;">${escapeHtml(d.confirmIntro)}</p>
     ${orders.map((o) => orderBlock(o, lang)).join("")}
     <p style="font-size:14px;line-height:1.6;margin-top:4px;">${escapeHtml(
       d.totalLabel
     )} <strong style="color:#004B32;">${formatEUR(total)} ${escapeHtml(
      translate(lang, "common.ttc")
    )}</strong></p>
     <p style="font-size:13px;color:#8A8478;line-height:1.6;">${escapeHtml(d.follow)}</p>`,
    lang
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
     ${orders.map((o) => orderBlock(o, "fr")).join("")}
     <p style="font-size:14px;">Total : <strong style="color:#004B32;">${formatEUR(
       total
     )} TTC</strong> · ${orders.length} devis</p>`
  );
}

// Statuts qui declenchent un email client, avec la cle i18n de leur libelle.
export const STATUT_EMAIL: Record<string, { labelKey: string } | undefined> = {
  en_production: { labelKey: "status.production" },
  expediee: { labelKey: "status.shipped" },
  livree: { labelKey: "status.delivered" },
};

export function statusLabel(statut: string, lang: Lang): string {
  const key = STATUT_EMAIL[statut]?.labelKey;
  return key ? translate(lang, key) : statut;
}

export function statusSubject(numero: string, statut: string, lang: Lang): string {
  return fill(EMAIL_I18N[lang].statusSubject, {
    numero,
    label: statusLabel(statut, lang),
  });
}

export function statusUpdateHtml(
  clientName: string,
  numero: string,
  statut: string,
  lang: Lang = "fr"
): string {
  const d = EMAIL_I18N[lang];
  const label = statusLabel(statut, lang);
  return shell(
    fill(d.statusTitle, { numero, label }),
    `<p style="font-size:14px;line-height:1.6;">${fill(escapeHtml(d.hello), {
      name: escapeHtml(clientName),
    })}</p>
     <p style="font-size:14px;line-height:1.6;">${escapeHtml(
       d.statusMsg[statut] ?? d.statusFallback
     )}</p>
     <div style="background:#F0F7EC;border:1px solid #AAE66E;border-radius:10px;padding:12px 14px;margin-top:12px;font-size:14px;">
       ${escapeHtml(d.statusLine)} <strong>${escapeHtml(numero)}</strong> — ${escapeHtml(
    d.status
  )} : <strong style="color:#004B32;">${escapeHtml(label)}</strong>
     </div>
     <p style="font-size:13px;color:#8A8478;line-height:1.6;margin-top:14px;">${escapeHtml(
       d.follow
     )}</p>`,
    lang
  );
}
