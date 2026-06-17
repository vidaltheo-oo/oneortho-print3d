// Panier client-side. Aligne sur le schema ecrit par le configurateur
// (public/configurateur-app.html) : meme cle localStorage et meme forme d'item,
// elle-meme calquee sur les tables Supabase devis + devis_pieces.

export const CART_KEY = "oneprint_cart";

// Evenement same-tab pour notifier les composants (le header) d'un changement
// de panier (l'evenement natif "storage" ne se declenche que cross-tab).
export const CART_CHANGED_EVENT = "oneprint-cart-change";

export type CartPiece = {
  nom_fichier: string;
  volume_mm3: number;
  quantite: number;
  prix_ht: number;
  finition: string;
  couleur: string;
  // Cle IndexedDB du binaire STL (ecrite par le configurateur a l'ajout au
  // panier ; lue au checkout pour l'upload vers Supabase Storage).
  stl_key?: string;
};

export type CartEntry = {
  id: string;
  numero: string;
  langue: string;
  nature_application: string | null;
  delai: string | null;
  remise: number;
  montant_ht: number;
  tva: number;
  montant_ttc: number;
  pieces: CartPiece[];
};

export function loadCart(): CartEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event(CART_CHANGED_EVENT));
  } catch {
    /* quota / storage indisponible : sans effet */
  }
}

// Nombre total de pieces (somme des quantites de toutes les lignes).
export function cartPieceCount(cart: CartEntry[]): number {
  return cart.reduce(
    (s, e) => s + (e.pieces || []).reduce((q, p) => q + (p.quantite || 1), 0),
    0
  );
}

export const NATURE_LABELS: Record<string, string> = {
  md: "Dispositif médical",
  proto: "Prototype",
  other: "Autre utilisation",
};

export const FINITION_LABELS: Record<string, string> = {
  micro: "Microbillée",
  lissage: "Lissage vapeur",
};

export const COULEUR_LABELS: Record<string, string> = {
  blanc: "Blanc",
  gris: "Gris",
  bleu: "Bleu",
  noir: "Noir",
  rouge: "Rouge",
  vert: "Vert",
  orange: "Orange",
};

export const DELAI_LABELS: Record<string, string> = {
  std: "Standard 5j",
  pri: "Priority 3j",
  exp: "Express 2j",
};

export function labelOf(
  map: Record<string, string>,
  key: string | null
): string {
  if (!key) return "—";
  return map[key] ?? key;
}

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatEUR(value: number): string {
  return eurFormatter.format(Number.isFinite(value) ? value : 0);
}
