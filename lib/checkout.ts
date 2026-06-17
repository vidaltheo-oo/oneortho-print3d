import { supabase } from "./supabaseClient";
import type { CartEntry } from "./cart";
import { getStl, deleteStl } from "./stlStore";

export const STL_BUCKET = "stl-files";

export type CheckoutResult =
  | { ok: true; count: number; commandeIds: string[] }
  | { ok: false; reason: "auth" | "no_client" | "empty" | "db"; message?: string };

// Persiste le panier : chaque ligne devient un devis (statut "envoye") avec ses
// devis_pieces, puis une commande (statut "en_attente"). Cet etat initial
// correspond a l'etape "Nouveau" du workflow admin (en attente de validation du
// devis) : la production ne peut etre lancee qu'une fois le devis valide.
// Chaque binaire STL (conserve en IndexedDB par le configurateur) est uploade
// vers Supabase Storage sous {user_id}/{devis_id}/{nom_fichier} et son chemin est
// enregistre dans devis_pieces.storage_path.
// Les RLS exigent que le client_id appartienne a l'utilisateur authentifie.
export async function submitCart(
  cart: CartEntry[],
  onProgress?: (pct: number) => void
): Promise<CheckoutResult> {
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

  // Progression : ponderee sur le nombre total de pieces a uploader.
  const totalFiles = cart.reduce((s, e) => s + e.pieces.length, 0);
  let uploaded = 0;
  const bump = () => {
    uploaded += 1;
    if (onProgress && totalFiles > 0) {
      onProgress(Math.round((uploaded / totalFiles) * 100));
    }
  };
  onProgress?.(0);

  const commandeIds: string[] = [];
  const uploadedKeys: string[] = [];

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
      // Upload des binaires (si presents en IndexedDB) puis insertion des pieces.
      const rows = [];
      for (const p of entry.pieces) {
        let storagePath: string | null = null;
        const buf = p.stl_key ? await getStl(p.stl_key) : null;
        if (buf) {
          const path = `${user.id}/${devis.id}/${p.nom_fichier}`;
          const { error: upErr } = await supabase.storage
            .from(STL_BUCKET)
            .upload(path, buf, {
              contentType: "model/stl",
              upsert: true,
            });
          if (upErr) {
            return { ok: false, reason: "db", message: upErr.message };
          }
          storagePath = path;
          if (p.stl_key) uploadedKeys.push(p.stl_key);
        }
        bump();
        rows.push({
          devis_id: devis.id,
          nom_fichier: p.nom_fichier,
          volume_mm3: p.volume_mm3,
          quantite: p.quantite,
          prix_ht: p.prix_ht,
          finition: p.finition,
          couleur: p.couleur,
          storage_path: storagePath,
        });
      }

      const { error: piecesError } = await supabase
        .from("devis_pieces")
        .insert(rows);
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

  // Nettoyage IndexedDB : les binaires vivent desormais dans Storage.
  for (const key of uploadedKeys) await deleteStl(key);
  onProgress?.(100);

  return { ok: true, count: cart.length, commandeIds };
}
