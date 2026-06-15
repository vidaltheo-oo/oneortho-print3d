import { bearerFromRequest, supabaseFromToken } from "@/lib/supabaseServer";
import {
  sendEmail,
  clientConfirmationHtml,
  internalNotificationHtml,
  INTERNAL_EMAIL,
  type EmailOrder,
} from "@/lib/email";

type Join = { raison_sociale: string | null; email: string | null; telephone: string | null };
type Piece = {
  nom_fichier: string;
  quantite: number | null;
  finition: string | null;
  couleur: string | null;
  volume_mm3: number | null;
};
type DevisJoin = {
  numero: string | null;
  montant_ht: number | null;
  tva: number | null;
  montant_ttc: number | null;
  delai: string | null;
  nature_application: string | null;
  devis_pieces: Piece[] | null;
};
type Row = {
  id: string;
  devis: DevisJoin | DevisJoin[] | null;
  clients: Join | Join[] | null;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export async function POST(request: Request) {
  const token = bearerFromRequest(request);
  if (!token) return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: { commandeIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const ids = Array.isArray(body.commandeIds) ? body.commandeIds : [];
  if (ids.length === 0) return Response.json({ error: "no_orders" }, { status: 400 });

  const supa = supabaseFromToken(token);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const { data, error } = await supa
    .from("commandes")
    .select(
      "id, devis:devis_id ( numero, montant_ht, tva, montant_ttc, delai, nature_application, devis_pieces ( nom_fichier, quantite, finition, couleur, volume_mm3 ) ), clients:client_id ( raison_sociale, email, telephone )"
    )
    .in("id", ids);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (data as Row[] | null) ?? [];
  if (rows.length === 0) return Response.json({ ok: true, sent: 0 });

  const orders: EmailOrder[] = rows.map((r) => {
    const d = one(r.devis);
    return {
      numero: d?.numero ?? r.id.slice(0, 8),
      natureApplication: d?.nature_application ?? null,
      delai: d?.delai ?? null,
      montantHt: d?.montant_ht ?? 0,
      tva: d?.tva ?? 0,
      montantTtc: d?.montant_ttc ?? 0,
      pieces: (d?.devis_pieces ?? []).map((p) => ({
        nom_fichier: p.nom_fichier,
        quantite: p.quantite ?? 1,
        finition: p.finition,
        couleur: p.couleur,
        volume_mm3: p.volume_mm3,
      })),
    };
  });

  const client = one(rows[0].clients);
  const clientName = client?.raison_sociale ?? "Client";
  const clientEmail = client?.email ?? user.email ?? null;

  const results: Record<string, unknown> = {};

  if (clientEmail) {
    results.client = await sendEmail({
      to: clientEmail,
      subject: "Votre demande de production ONE PRINT est confirmée",
      html: clientConfirmationHtml(clientName, orders),
      replyTo: INTERNAL_EMAIL,
    });
  }

  results.internal = await sendEmail({
    to: INTERNAL_EMAIL,
    subject: `Nouvelle commande — ${clientName}`,
    html: internalNotificationHtml(
      {
        raison_sociale: client?.raison_sociale ?? null,
        email: client?.email ?? user.email ?? null,
        telephone: client?.telephone ?? null,
      },
      orders
    ),
    replyTo: clientEmail ?? undefined,
  });

  return Response.json({ ok: true, sent: orders.length, results });
}
