import { supabase } from "./supabaseClient";

export type CommandeStatut =
  | "en_attente"
  | "en_production"
  | "expediee"
  | "livree"
  | "annulee";

export type OrderPiece = {
  nom_fichier: string;
  quantite: number;
  finition: string | null;
  couleur: string | null;
  volume_mm3: number | null;
};

export type Order = {
  id: string;
  numero: string;
  statut: CommandeStatut;
  // Statut du devis lie : permet de distinguer l'etape "Validé" (devis accepté,
  // commande encore en_attente) de l'etape "Nouveau" cote suivi client.
  devisStatut: string | null;
  createdAt: string;
  montantHt: number;
  montantTtc: number;
  natureApplication: string | null;
  delai: string | null;
  pieces: OrderPiece[];
};

// Etapes du suivi de production (tracker 4 etapes).
export const TRACKER_STEPS = [
  "Commande reçue",
  "Confirmée",
  "En fabrication",
  "Expédiée",
];

type StatutMeta = {
  label: string;
  bg: string;
  fg: string;
  trackerIdx: number;
  cancelled?: boolean;
  delivered?: boolean;
};

export const STATUT_META: Record<CommandeStatut, StatutMeta> = {
  en_attente: { label: "En traitement", bg: "#FFF3E0", fg: "#B26A00", trackerIdx: 0 },
  en_production: { label: "En fabrication", bg: "#E3F2FD", fg: "#1565C0", trackerIdx: 2 },
  expediee: { label: "Expédiée", bg: "#F3E5F5", fg: "#6A1B9A", trackerIdx: 3 },
  livree: { label: "Livrée", bg: "#E8F5E9", fg: "#004B32", trackerIdx: 3, delivered: true },
  annulee: { label: "Annulée", bg: "#FDEAEA", fg: "#C62828", cancelled: true, trackerIdx: 0 },
};

export function statutMeta(statut: CommandeStatut): StatutMeta {
  return STATUT_META[statut] ?? STATUT_META.en_attente;
}

// Statut effectif cote client a partir du workflow devis + commande :
//   Nouveau (recue) -> Confirmée (devis validé) -> En fabrication -> Expédiée -> Livrée
// La commande nait "en_attente" : tant que le devis n'est pas accepté on reste a
// l'etape "Commande reçue" ; une fois accepté (mais pas encore en production) on
// passe a "Confirmée" (tracker index 1, jusque-la jamais atteint).
export function clientStatusMeta(order: Order): StatutMeta {
  if (order.devisStatut === "refuse") {
    return { label: "Annulée", bg: "#FDEAEA", fg: "#C62828", cancelled: true, trackerIdx: 0 };
  }
  if (order.statut === "en_attente" && order.devisStatut === "accepte") {
    return { label: "Confirmée", bg: "#E3F2FD", fg: "#1565C0", trackerIdx: 1 };
  }
  return statutMeta(order.statut);
}

// En cours : non terminees ; Passees : livrees ou annulees.
export function isCurrent(statut: CommandeStatut): boolean {
  return statut === "en_attente" || statut === "en_production" || statut === "expediee";
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFormatter.format(d);
}

export function pieceCount(order: Order): number {
  return order.pieces.reduce((s, p) => s + (p.quantite || 1), 0);
}

type DevisRow = {
  numero: string | null;
  statut: string | null;
  montant_ht: number | null;
  montant_ttc: number | null;
  delai: string | null;
  nature_application: string | null;
  devis_pieces: OrderPiece[] | null;
};

type CommandeRow = {
  id: string;
  statut: CommandeStatut;
  created_at: string;
  devis: DevisRow | DevisRow[] | null;
};

export type FetchResult =
  | { ok: true; orders: Order[] }
  | { ok: false; reason: "auth" | "db"; message?: string };

export async function fetchOrders(): Promise<FetchResult> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, reason: "auth" };

  // RLS limite deja les commandes a celles du client authentifie.
  const { data, error } = await supabase
    .from("commandes")
    .select(
      "id, statut, created_at, devis:devis_id ( numero, statut, montant_ht, montant_ttc, delai, nature_application, devis_pieces ( nom_fichier, quantite, finition, couleur, volume_mm3 ) )"
    )
    .order("created_at", { ascending: false });

  if (error) return { ok: false, reason: "db", message: error.message };

  const orders: Order[] = (data as CommandeRow[] | null ?? []).map((row) => {
    const devis = Array.isArray(row.devis) ? row.devis[0] : row.devis;
    return {
      id: row.id,
      numero: devis?.numero ?? row.id.slice(0, 8),
      statut: row.statut,
      devisStatut: devis?.statut ?? null,
      createdAt: row.created_at,
      montantHt: devis?.montant_ht ?? 0,
      montantTtc: devis?.montant_ttc ?? 0,
      natureApplication: devis?.nature_application ?? null,
      delai: devis?.delai ?? null,
      pieces: devis?.devis_pieces ?? [],
    };
  });

  return { ok: true, orders };
}
