import { bearerFromRequest, supabaseFromToken } from "@/lib/supabaseServer";
import {
  sendEmail,
  statusUpdateHtml,
  statusSubject,
  emailLang,
  STATUT_EMAIL,
  INTERNAL_EMAIL,
} from "@/lib/email";

type Join = { raison_sociale: string | null; email: string | null };
type DevisJoin = { numero: string | null; langue: string | null };
type Row = {
  id: string;
  devis: DevisJoin | DevisJoin[] | null;
  clients: Join | Join[] | null;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v ?? null;
}

export async function POST(request: Request) {
  let body: { commandeId?: string; statut?: string; accessToken?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // Token via le body (fiable) ou l'en-tete Authorization (fallback).
  const token =
    (typeof body.accessToken === "string" && body.accessToken) ||
    bearerFromRequest(request);
  if (!token) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const { commandeId, statut } = body;
  if (!commandeId || !statut)
    return Response.json({ error: "bad_request" }, { status: 400 });

  // Seuls certains statuts declenchent un email client.
  if (!STATUT_EMAIL[statut]) return Response.json({ ok: true, skipped: "statut" });

  // Autorisation par RLS (pas de getUser, non fiable en serverless).
  // admins_select_self ne renvoie que la ligne de l'appelant : une ligne
  // presente => l'utilisateur est admin.
  const supa = supabaseFromToken(token);
  const { data: adminRow } = await supa
    .from("admins")
    .select("user_id")
    .maybeSingle();
  if (!adminRow) return Response.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supa
    .from("commandes")
    .select("id, devis:devis_id ( numero, langue ), clients:client_id ( raison_sociale, email )")
    .eq("id", commandeId)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "not_found" }, { status: 404 });

  const row = data as Row;
  const client = one(row.clients);
  const devis = one(row.devis);
  const numero = devis?.numero ?? row.id.slice(0, 8);
  const lang = emailLang(devis?.langue);
  const clientEmail = client?.email ?? null;

  if (!clientEmail) return Response.json({ ok: true, skipped: "no_email" });

  const result = await sendEmail({
    to: clientEmail,
    subject: statusSubject(numero, statut, lang),
    html: statusUpdateHtml(client?.raison_sociale ?? "Client", numero, statut, lang),
    replyTo: INTERNAL_EMAIL,
  });

  return Response.json({ ok: true, result });
}
