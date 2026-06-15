import { bearerFromRequest, supabaseFromToken } from "@/lib/supabaseServer";
import { sendEmail, statusUpdateHtml, STATUT_EMAIL, INTERNAL_EMAIL } from "@/lib/email";

type Join = { raison_sociale: string | null; email: string | null };
type DevisJoin = { numero: string | null };
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

  let body: { commandeId?: string; statut?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const { commandeId, statut } = body;
  if (!commandeId || !statut)
    return Response.json({ error: "bad_request" }, { status: 400 });

  // Seuls certains statuts declenchent un email client.
  if (!STATUT_EMAIL[statut]) return Response.json({ ok: true, skipped: "statut" });

  const supa = supabaseFromToken(token);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  // Autorisation : seul un admin peut declencher une notification de statut.
  const { data: adminRow } = await supa
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return Response.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supa
    .from("commandes")
    .select("id, devis:devis_id ( numero ), clients:client_id ( raison_sociale, email )")
    .eq("id", commandeId)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });

  const row = data as Row;
  const client = one(row.clients);
  const numero = one(row.devis)?.numero ?? row.id.slice(0, 8);
  const clientEmail = client?.email ?? null;

  if (!clientEmail) return Response.json({ ok: true, skipped: "no_email" });

  const result = await sendEmail({
    to: clientEmail,
    subject: `Votre commande ${numero} — ${STATUT_EMAIL[statut]!.label}`,
    html: statusUpdateHtml(client?.raison_sociale ?? "Client", numero, statut),
    replyTo: INTERNAL_EMAIL,
  });

  return Response.json({ ok: true, result });
}
