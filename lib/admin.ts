import { supabase } from "./supabaseClient";

export type DevisStatut = "brouillon" | "envoye" | "accepte" | "refuse" | "expire";
export type CommandeStatut =
  | "en_attente"
  | "en_production"
  | "expediee"
  | "livree"
  | "annulee";

export type ClientLite = { raison_sociale: string | null; email: string | null };

export type AdminDevis = {
  id: string;
  numero: string;
  statut: DevisStatut;
  montantHt: number;
  montantTtc: number;
  remise: number;
  delai: string | null;
  natureApplication: string | null;
  createdAt: string;
  client: ClientLite | null;
  filesCount: number;
};

export type AdminCommande = {
  id: string;
  statut: CommandeStatut;
  createdAt: string;
  numero: string;
  montantHt: number;
  montantTtc: number;
  delai: string | null;
  natureApplication: string | null;
  client: ClientLite | null;
  filesCount: number;
};

type BadgeMeta = { label: string; bg: string; fg: string };

export const DEVIS_STATUT_META: Record<DevisStatut, BadgeMeta> = {
  brouillon: { label: "Brouillon", bg: "#ECEFF1", fg: "#546E7A" },
  envoye: { label: "Nouveau", bg: "#FFF3E0", fg: "#FF6C4F" },
  accepte: { label: "Validé", bg: "#E8F5E9", fg: "#004B32" },
  refuse: { label: "Refusé", bg: "#FDEAEA", fg: "#C62828" },
  expire: { label: "Expiré", bg: "#ECEFF1", fg: "#546E7A" },
};

export const COMMANDE_STATUT_META: Record<CommandeStatut, BadgeMeta> = {
  en_attente: { label: "À lancer", bg: "#FFF3E0", fg: "#FF6C4F" },
  en_production: { label: "En production", bg: "#E3F2FD", fg: "#1565C0" },
  expediee: { label: "Expédiée", bg: "#F3E5F5", fg: "#6A1B9A" },
  livree: { label: "Livrée", bg: "#E8F5E9", fg: "#004B32" },
  annulee: { label: "Annulée", bg: "#FDEAEA", fg: "#C62828" },
};

// Transition de statut commande proposee a l'admin (action principale).
export const COMMANDE_NEXT: Partial<
  Record<CommandeStatut, { to: CommandeStatut; label: string }>
> = {
  en_attente: { to: "en_production", label: "Lancer la production" },
  en_production: { to: "expediee", label: "Marquer expédiée" },
  expediee: { to: "livree", label: "Marquer livrée" },
};

const eur = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatEURk(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString("fr-FR", {
      maximumFractionDigits: 1,
    })}k €`;
  }
  return eur.format(value);
}
export function formatEUR2(value: number): string {
  return eur2.format(Number.isFinite(value) ? value : 0);
}

const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
});
export function formatShort(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : shortDate.format(d);
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  return !!data;
}

type DevisJoin = {
  raison_sociale: string | null;
  email: string | null;
};

type DevisRow = {
  id: string;
  numero: string | null;
  statut: DevisStatut;
  montant_ht: number | null;
  montant_ttc: number | null;
  remise: number | null;
  delai: string | null;
  nature_application: string | null;
  created_at: string;
  clients: DevisJoin | DevisJoin[] | null;
  devis_pieces: { quantite: number | null }[] | null;
};

type CommandeRow = {
  id: string;
  statut: CommandeStatut;
  created_at: string;
  clients: DevisJoin | DevisJoin[] | null;
  devis:
    | {
        numero: string | null;
        montant_ht: number | null;
        montant_ttc: number | null;
        delai: string | null;
        nature_application: string | null;
        devis_pieces: { quantite: number | null }[] | null;
      }
    | null
    | Array<{
        numero: string | null;
        montant_ht: number | null;
        montant_ttc: number | null;
        delai: string | null;
        nature_application: string | null;
        devis_pieces: { quantite: number | null }[] | null;
      }>;
};

function one<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export type AdminData = { devis: AdminDevis[]; commandes: AdminCommande[] };

export type AdminFetchResult =
  | { ok: true; data: AdminData }
  | { ok: false; message?: string };

export async function fetchAdminData(): Promise<AdminFetchResult> {
  const devisQuery = supabase
    .from("devis")
    .select(
      "id, numero, statut, montant_ht, montant_ttc, remise, delai, nature_application, created_at, clients:client_id ( raison_sociale, email ), devis_pieces ( quantite )"
    )
    .order("created_at", { ascending: false });

  const commandesQuery = supabase
    .from("commandes")
    .select(
      "id, statut, created_at, clients:client_id ( raison_sociale, email ), devis:devis_id ( numero, montant_ht, montant_ttc, delai, nature_application, devis_pieces ( quantite ) )"
    )
    .order("created_at", { ascending: false });

  const [devisRes, commandesRes] = await Promise.all([devisQuery, commandesQuery]);

  if (devisRes.error) return { ok: false, message: devisRes.error.message };
  if (commandesRes.error) return { ok: false, message: commandesRes.error.message };

  const devis: AdminDevis[] = ((devisRes.data as DevisRow[] | null) ?? []).map(
    (r) => ({
      id: r.id,
      numero: r.numero ?? r.id.slice(0, 8),
      statut: r.statut,
      montantHt: r.montant_ht ?? 0,
      montantTtc: r.montant_ttc ?? 0,
      remise: r.remise ?? 0,
      delai: r.delai,
      natureApplication: r.nature_application,
      createdAt: r.created_at,
      client: one(r.clients),
      filesCount: r.devis_pieces?.length ?? 0,
    })
  );

  const commandes: AdminCommande[] = (
    (commandesRes.data as CommandeRow[] | null) ?? []
  ).map((r) => {
    const d = one(r.devis);
    return {
      id: r.id,
      statut: r.statut,
      createdAt: r.created_at,
      numero: d?.numero ?? r.id.slice(0, 8),
      montantHt: d?.montant_ht ?? 0,
      montantTtc: d?.montant_ttc ?? 0,
      delai: d?.delai ?? null,
      natureApplication: d?.nature_application ?? null,
      client: one(r.clients),
      filesCount: d?.devis_pieces?.length ?? 0,
    };
  });

  return { ok: true, data: { devis, commandes } };
}

export async function updateDevisStatut(
  id: string,
  statut: DevisStatut
): Promise<boolean> {
  const { error } = await supabase.from("devis").update({ statut }).eq("id", id);
  return !error;
}

export async function updateCommandeStatut(
  id: string,
  statut: CommandeStatut
): Promise<boolean> {
  const { error } = await supabase
    .from("commandes")
    .update({ statut })
    .eq("id", id);
  return !error;
}

// ---------- KPI / agrégations ----------

function isSameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
  );
}

export type DashboardKpis = {
  devisMois: number;
  caMois: number;
  conversion: number;
  enAttente: number;
};

export function computeDashboardKpis(
  devis: AdminDevis[],
  now: Date
): DashboardKpis {
  const mois = devis.filter((d) => isSameMonth(d.createdAt, now));
  const caMois = mois.reduce((s, d) => s + d.montantHt, 0);
  const accepte = devis.filter((d) => d.statut === "accepte").length;
  const conversion = devis.length ? Math.round((accepte / devis.length) * 100) : 0;
  const enAttente = devis.filter((d) => d.statut === "envoye").length;
  return { devisMois: mois.length, caMois, conversion, enAttente };
}

export type StatutBar = { statut: DevisStatut; count: number };

export function computeStatutRepartition(devis: AdminDevis[]): StatutBar[] {
  const order: DevisStatut[] = ["envoye", "accepte", "refuse", "brouillon", "expire"];
  return order
    .map((statut) => ({
      statut,
      count: devis.filter((d) => d.statut === statut).length,
    }))
    .filter((b) => b.count > 0);
}

export type MonthBar = { label: string; value: number; current: boolean };

const MONTHS_FR = [
  "janv", "févr", "mars", "avr", "mai", "juin",
  "juil", "août", "sept", "oct", "nov", "déc",
];

// CA HT par mois sur les 12 derniers mois (mois courant inclus, a droite).
export function computeCa12Months(devis: AdminDevis[], now: Date): MonthBar[] {
  const buckets: MonthBar[] = [];
  for (let i = 11; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = devis
      .filter((d) => isSameMonth(d.createdAt, ref))
      .reduce((s, d) => s + d.montantHt, 0);
    buckets.push({
      label: MONTHS_FR[ref.getMonth()],
      value,
      current: i === 0,
    });
  }
  return buckets;
}

export type CommandeKpis = {
  aLancer: number;
  enProduction: number;
  expedieesMois: number;
  caProduction: number;
};

export function computeCommandeKpis(
  commandes: AdminCommande[],
  now: Date
): CommandeKpis {
  return {
    aLancer: commandes.filter((c) => c.statut === "en_attente").length,
    enProduction: commandes.filter((c) => c.statut === "en_production").length,
    expedieesMois: commandes.filter(
      (c) => c.statut === "expediee" && isSameMonth(c.createdAt, now)
    ).length,
    caProduction: commandes
      .filter((c) => c.statut === "en_production")
      .reduce((s, c) => s + c.montantHt, 0),
  };
}
