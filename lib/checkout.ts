import { supabase } from "./supabaseClient";
import { loadCart, saveCart, type CartEntry } from "./cart";
import { getStl, deleteStl } from "./stlStore";

export const STL_BUCKET = "stl-files";

// Bon de commande client (optionnel) : PDF uniquement, 10 Mo max.
export const PO_MAX_BYTES = 10 * 1024 * 1024;
export const PO_REF_MAX = 50;

export type PurchaseOrder = { ref: string; file: File | null };

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export type CheckoutResult =
  | { ok: true; count: number; commandeIds: string[] }
  | {
      ok: false;
      reason: "auth" | "no_client" | "empty" | "db";
      message?: string;
      // Entrees deja persistees (devis + commande crees) avant l'echec : elles
      // ont ete retirees du panier et ne seront pas re-soumises au prochain essai.
      persistedCount: number;
      commandeIds: string[];
    };

// Nom de fichier sur pour une cle Storage : pas de separateurs de chemin ni de
// caracteres speciaux (le nom vient du poste client, non fiable).
function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^A-Za-z0-9._\-() ]/g, "_").slice(-100);
  return cleaned || "piece.stl";
}

// Persiste le panier : chaque ligne devient un devis (statut "envoye") avec ses
// devis_pieces, puis une commande (statut "en_attente"). Cet etat initial
// correspond a l'etape "Nouveau" du workflow admin (en attente de validation du
// devis) : la production ne peut etre lancee qu'une fois le devis valide.
// Chaque binaire STL (conserve en IndexedDB par le configurateur) est uploade
// vers Supabase Storage sous {user_id}/{devis_id}/{index}-{nom_fichier} (l'index
// evite l'ecrasement de deux pieces homonymes) et son chemin est enregistre dans
// devis_pieces.storage_path.
// Les RLS exigent que le client_id appartienne a l'utilisateur authentifie.
//
// Idempotence : la creation n'est pas transactionnelle (plusieurs requetes),
// donc chaque entree entierement persistee est retiree du panier localStorage
// immediatement. Un echec en milieu de panier laisse uniquement les entrees non
// soumises ; re-cliquer ne cree pas de doublon.
//
// Bon de commande : la reference et le PDF saisis au checkout valent pour tout
// le panier. Le PDF est uploade une seule fois, avant toute ecriture en base
// (un echec d'upload ne laisse ainsi aucun devis orphelin), sous
// {user_id}/bons-commande/{horodatage}-{nom_fichier}, et son chemin est
// enregistre sur chaque commande (commandes.bon_commande_path).
export async function submitCart(
  cart: CartEntry[],
  onProgress?: (pct: number) => void,
  po?: PurchaseOrder
): Promise<CheckoutResult> {
  const commandeIds: string[] = [];
  let persistedCount = 0;
  const fail = (
    reason: "auth" | "no_client" | "empty" | "db",
    message?: string
  ): CheckoutResult => ({ ok: false, reason, message, persistedCount, commandeIds });

  if (!cart.length) return fail("empty");

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return fail("auth");

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientError) return fail("db", clientError.message);
  if (!client) return fail("no_client");

  // Progression : uploads de binaires + 3 etapes DB par entree (devis, pieces,
  // commande), pour que la barre ne stagne pas a 100 % pendant les insertions.
  const poFile = po?.file ?? null;
  const refClient = po?.ref.trim().slice(0, PO_REF_MAX) || null;
  const totalUnits =
    cart.reduce((s, e) => s + e.pieces.length, 0) +
    cart.length * 3 +
    (poFile ? 1 : 0);
  let doneUnits = 0;
  const bump = () => {
    doneUnits += 1;
    onProgress?.(Math.min(100, Math.round((doneUnits / totalUnits) * 100)));
  };
  onProgress?.(0);

  let bonCommandePath: string | null = null;
  if (poFile) {
    if (!isPdfFile(poFile) || poFile.size > PO_MAX_BYTES)
      return fail("db", "invalid purchase order file");
    const path = `${user.id}/bons-commande/${Date.now()}-${safeFileName(poFile.name)}`;
    const { error: poErr } = await supabase.storage
      .from(STL_BUCKET)
      .upload(path, poFile, { contentType: "application/pdf", upsert: false });
    if (poErr) return fail("db", poErr.message);
    bonCommandePath = path;
    bump();
  }

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
        livraison: entry.livraison ?? "std",
        nettoyage: entry.nettoyage ?? false,
        dossier_lot: entry.dossier_lot ?? false,
        teinture_total: entry.teinture_total ?? 0,
      })
      .select("id")
      .single();

    if (devisError || !devis) return fail("db", devisError?.message);
    bump();

    const entryKeys: string[] = [];

    if (entry.pieces.length) {
      // Upload des binaires en parallele (si presents en IndexedDB), puis
      // insertion des pieces en un seul insert.
      let rows: Array<Record<string, unknown>>;
      try {
        rows = await Promise.all(
          entry.pieces.map(async (p, i) => {
            let storagePath: string | null = null;
            const buf = p.stl_key ? await getStl(p.stl_key) : null;
            if (buf) {
              const path = `${user.id}/${devis.id}/${i + 1}-${safeFileName(p.nom_fichier)}`;
              const { error: upErr } = await supabase.storage
                .from(STL_BUCKET)
                .upload(path, buf, { contentType: "model/stl", upsert: true });
              if (upErr) throw new Error(upErr.message);
              storagePath = path;
              if (p.stl_key) entryKeys.push(p.stl_key);
            }
            bump();
            return {
              devis_id: devis.id,
              nom_fichier: p.nom_fichier,
              volume_mm3: p.volume_mm3,
              quantite: p.quantite,
              prix_ht: p.prix_ht,
              finition: p.finition,
              couleur: p.couleur,
              storage_path: storagePath,
            };
          })
        );
      } catch (e) {
        return fail("db", e instanceof Error ? e.message : "upload failed");
      }

      const { error: piecesError } = await supabase
        .from("devis_pieces")
        .insert(rows);
      if (piecesError) return fail("db", piecesError.message);
    }
    bump();

    const { data: commande, error: commandeError } = await supabase
      .from("commandes")
      .insert({
        devis_id: devis.id,
        client_id: client.id,
        statut: "en_attente",
        ref_client: refClient,
        bon_commande_path: bonCommandePath,
      })
      .select("id")
      .single();
    if (commandeError || !commande) return fail("db", commandeError?.message);
    bump();

    commandeIds.push(commande.id);
    persistedCount += 1;

    // L'entree est entierement persistee : on la retire du panier stocke et on
    // libere ses binaires IndexedDB (desormais dans Storage).
    saveCart(loadCart().filter((e) => e.id !== entry.id));
    for (const key of entryKeys) await deleteStl(key);
  }

  onProgress?.(100);

  return { ok: true, count: cart.length, commandeIds };
}
