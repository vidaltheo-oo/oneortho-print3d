import { supabase } from "./supabaseClient";

// Profil client tel que saisi a l'inscription. Mappe la table public.clients.
// adresse_facturation / adresse_livraison sont stockees en texte libre
// (la table n'a qu'une colonne texte par adresse).
export type ClientProfile = {
  raison_sociale: string;
  siret?: string | null;
  tva_intracom?: string | null;
  type_activite?: string | null;
  nom?: string | null;
  fonction?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse_facturation?: string | null;
  adresse_livraison?: string | null;
};

// Cree la ligne public.clients pour l'utilisateur authentifie si elle n'existe
// pas encore. Best-effort : utilise pour reconcilier le cas ou l'inscription a
// exige une confirmation email (la ligne ne peut etre creee qu'une fois la
// session active, RLS exigeant auth.uid() = user_id). Le profil est lu depuis
// user_metadata, source de verite posee au signup.
export async function ensureClientRecord(
  userId: string,
  profile: ClientProfile | null | undefined
): Promise<void> {
  if (!profile?.raison_sociale) return;

  const { data: existing, error: selectError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError || existing) return;

  await supabase.from("clients").insert({
    user_id: userId,
    raison_sociale: profile.raison_sociale,
    siret: profile.siret ?? null,
    tva_intracom: profile.tva_intracom ?? null,
    type_activite: profile.type_activite ?? null,
    nom: profile.nom ?? null,
    fonction: profile.fonction ?? null,
    email: profile.email ?? null,
    telephone: profile.telephone ?? null,
    adresse_facturation: profile.adresse_facturation ?? null,
    adresse_livraison: profile.adresse_livraison ?? null,
  });
}

export type ClientRecord = ClientProfile & { id: string; user_id: string };

export type FetchClientResult =
  | {
      ok: true;
      client: ClientRecord | null;
      authEmail: string | null;
      metadata: ClientProfile | null;
    }
  | { ok: false; reason: "auth" | "db"; message?: string };

// Charge la fiche client de l'utilisateur authentifie (+ email de connexion et
// metadata, utiles si la ligne clients n'existe pas encore).
export async function fetchClient(): Promise<FetchClientResult> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, reason: "auth" };

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, user_id, raison_sociale, siret, tva_intracom, type_activite, nom, fonction, email, telephone, adresse_facturation, adresse_livraison"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { ok: false, reason: "db", message: error.message };

  return {
    ok: true,
    client: (data as ClientRecord | null) ?? null,
    authEmail: user.email ?? null,
    metadata: (user.user_metadata as ClientProfile) ?? null,
  };
}

export type SaveClientResult =
  | { ok: true; id: string }
  | { ok: false; reason: "auth" | "db"; message?: string };

// Enregistre la fiche : update si elle existe, sinon insert. Synchronise aussi
// user_metadata (le header et les futures connexions lisent raison_sociale la).
export async function saveClient(
  clientId: string | null,
  profile: ClientProfile
): Promise<SaveClientResult> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, reason: "auth" };

  const row = {
    user_id: user.id,
    raison_sociale: profile.raison_sociale,
    siret: profile.siret ?? null,
    tva_intracom: profile.tva_intracom ?? null,
    type_activite: profile.type_activite ?? null,
    nom: profile.nom ?? null,
    fonction: profile.fonction ?? null,
    email: profile.email ?? null,
    telephone: profile.telephone ?? null,
    adresse_facturation: profile.adresse_facturation ?? null,
    adresse_livraison: profile.adresse_livraison ?? null,
  };

  let savedId = clientId;

  if (clientId) {
    const { error } = await supabase
      .from("clients")
      .update(row)
      .eq("id", clientId);
    if (error) return { ok: false, reason: "db", message: error.message };
  } else {
    const { data, error } = await supabase
      .from("clients")
      .insert(row)
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, reason: "db", message: error?.message };
    }
    savedId = data.id;
  }

  // Sync metadata (non bloquant pour le resultat).
  await supabase.auth.updateUser({ data: { ...profile } });

  return { ok: true, id: savedId as string };
}
