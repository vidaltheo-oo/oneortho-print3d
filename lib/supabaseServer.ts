import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client Supabase lie au token d'un utilisateur (pour route handlers).
// Les requetes s'executent sous l'identite de l'utilisateur => RLS appliquee.
export function supabaseFromToken(accessToken: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Variables Supabase manquantes (URL / ANON_KEY).");
  }
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Extrait le bearer token de l'en-tete Authorization d'une requete.
export function bearerFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
