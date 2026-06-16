import { supabase } from "./supabaseClient";
import type { CartEntry } from "./cart";

export type CheckoutResult =
  | { ok: true; count: number; commandeIds: string[] }
  | { ok: false; reason: "auth" | "no_client" | "empty" | "db"; message?: string };

// Persiste le panier : chaque ligne devient un devis (statut "envoye") avec ses
// devis_pieces, puis une commande (statut "en_attente"). Cet etat initial
// correspond a l'etape "Nouveau" du workflow admin (en attente de validation du
// devis) : la production ne peut etre lancee qu'une fois le devis valide.
// Les RLS exigent que le client_id appartienne a l'utilisateur authentifie.
export async function submitCart(cart: CartEntry[]): Promise<CheckoutResult> {
  if (!cart.length) return { ok: false, reason: "empty" };

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, reason: "auth" };

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientError) return { ok: false, reason: "db", message: clientError.message };
  if (!client) return { ok: false, reason: "no_client" };

  const commandeIds: string[] = [];

  for (const entry of cart) {
    const { data: devis, error: devisError } = await supabase
      .from("devis")
      .insert({
        client_id: client.id,
        numero: entry.id,
        statut: "envoye",
        montant_ht: entry.montant_ht,
        tva: entry.tva,
        montant_ttc: entry.montant_ttc,
        remise: entry.remise,
        delai: entry.delai,
        langue: entry.langue || "fr",
        nature_application: entry.nature_application,
      })
      .select("id")
      .single();

    if (devisError || !devis) {
      return { ok: false, reason: "db", message: devisError?.message };
    }

    if (entry.pieces.length) {
      const { error: piecesError } = await supabase.from("devis_pieces").insert(
        entry.pieces.map((p) => ({
          devis_id: devis.id,
          nom_fichier: p.nom_fichier,
          volume_mm3: p.volume_mm3,
          quantite: p.quantite,
          prix_ht: p.prix_ht,
          finition: p.finition,
          couleur: p.couleur,
        }))
      );
      if (piecesError) {
        return { ok: false, reason: "db", message: piecesError.message };
      }
    }

    const { data: commande, error: commandeError } = await supabase
      .from("commandes")
      .insert({
        devis_id: devis.id,
        client_id: client.id,
        statut: "en_attente",
      })
      .select("id")
      .single();
    if (commandeError || !commande) {
      return { ok: false, reason: "db", message: commandeError?.message };
    }
    commandeIds.push(commande.id);
  }

  return { ok: true, count: cart.length, commandeIds };
}
