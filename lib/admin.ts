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
  // Statut de la commande liee (le checkout cree devis + commande ensemble).
  // Quand il existe, c'est lui qui reflete le cycle de vie reel, pas devis.statut.
  commandeStatut: CommandeStatut | null;
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

const fullDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
export function formatDateFr(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : fullDate.format(d);
}

// Detecte si l'utilisateur est administrateur (presence dans la table admins).
// On accepte un userId explicite : juste apres signInWithPassword l'appelant
// dispose deja de l'id, ce qui evite un aller-retour getUser() supplementaire
// (source de fausses negatives au moment de la redirection post-connexion).
export async function checkIsAdmin(userId?: string): Promise<boolean> {
  let uid = userId;
  if (!uid) {
    const { data: userData } = await supabase.auth.getUser();
    uid = userData.user?.id;
  }
  if (!uid) return false;
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error("checkIsAdmin:", error.message);
    return false;
  }
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
  commandes: { statut: CommandeStatut }[] | { statut: CommandeStatut } | null;
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
      "id, numero, statut, montant_ht, montant_ttc, remise, delai, nature_application, created_at, clients:client_id ( raison_sociale, email ), devis_pieces ( quantite ), commandes ( statut )"
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
      commandeStatut: one(r.commandes)?.statut ?? null,
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

// ---------- Clients (back-office) ----------

export type AdminClient = {
  id: string;
  raisonSociale: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  siret: string | null;
  tvaIntracom: string | null;
  typeActivite: string | null;
  fonction: string | null;
  adresseFacturation: string | null;
  adresseLivraison: string | null;
  createdAt: string;
  ordersCount: number;
};

type ClientRow = {
  id: string;
  raison_sociale: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  siret: string | null;
  tva_intracom: string | null;
  type_activite: string | null;
  fonction: string | null;
  adresse_facturation: string | null;
  adresse_livraison: string | null;
  created_at: string;
  commandes: { count: number }[] | null;
};

export type AdminClientsResult =
  | { ok: true; clients: AdminClient[] }
  | { ok: false; message?: string };

export async function fetchAdminClients(): Promise<AdminClientsResult> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, raison_sociale, nom, email, telephone, siret, tva_intracom, type_activite, fonction, adresse_facturation, adresse_livraison, created_at, commandes(count)"
    )
    .order("created_at", { ascending: false });

  if (error) return { ok: false, message: error.message };

  const clients: AdminClient[] = ((data as ClientRow[] | null) ?? []).map(
    (r) => ({
      id: r.id,
      raisonSociale: r.raison_sociale,
      nom: r.nom,
      email: r.email,
      telephone: r.telephone,
      siret: r.siret,
      tvaIntracom: r.tva_intracom,
      typeActivite: r.type_activite,
      fonction: r.fonction,
      adresseFacturation: r.adresse_facturation,
      adresseLivraison: r.adresse_livraison,
      createdAt: r.created_at,
      ordersCount: r.commandes?.[0]?.count ?? 0,
    })
  );

  return { ok: true, clients };
}

export type AdminClientOrder = {
  id: string;
  numero: string;
  statut: CommandeStatut;
  createdAt: string;
  montantHt: number;
};

type ClientOrderRow = {
  id: string;
  statut: CommandeStatut;
  created_at: string;
  devis:
    | { numero: string | null; montant_ht: number | null }
    | { numero: string | null; montant_ht: number | null }[]
    | null;
};

// Historique des commandes d'un client (panneau detail), charge a la demande.
export async function fetchClientOrders(
  clientId: string
): Promise<AdminClientOrder[]> {
  const { data, error } = await supabase
    .from("commandes")
    .select("id, statut, created_at, devis:devis_id ( numero, montant_ht )")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) return [];

  return ((data as ClientOrderRow[] | null) ?? []).map((r) => {
    const d = one(r.devis);
    return {
      id: r.id,
      numero: d?.numero ?? r.id.slice(0, 8),
      statut: r.statut,
      createdAt: r.created_at,
      montantHt: d?.montant_ht ?? 0,
    };
  });
}

// ---------- Fichiers STL (back-office) ----------

export type AdminStlFile = {
  id: string;
  nomFichier: string;
  volumeMm3: number | null;
  devisNumero: string | null;
  clientRaisonSociale: string | null;
  createdAt: string;
  commandeNumero: string | null;
};

type StlClientJoin = { raison_sociale: string | null };
type StlDevisJoin = {
  numero: string | null;
  created_at: string | null;
  clients: StlClientJoin | StlClientJoin[] | null;
  commandes: { id: string }[] | { id: string } | null;
};
type StlPieceRow = {
  id: string;
  nom_fichier: string;
  volume_mm3: number | null;
  devis: StlDevisJoin | StlDevisJoin[] | null;
};

export type AdminStlResult =
  | { ok: true; files: AdminStlFile[] }
  | { ok: false; message?: string };

export async function fetchAdminStl(): Promise<AdminStlResult> {
  const { data, error } = await supabase
    .from("devis_pieces")
    .select(
      "id, nom_fichier, volume_mm3, devis:devis_id ( numero, created_at, clients:client_id ( raison_sociale ), commandes ( id ) )"
    );

  if (error) return { ok: false, message: error.message };

  const files: AdminStlFile[] = ((data as StlPieceRow[] | null) ?? []).map(
    (r) => {
      const d = one(r.devis);
      const client = one(d?.clients ?? null);
      const commandes = Array.isArray(d?.commandes)
        ? d?.commandes
        : d?.commandes
          ? [d.commandes]
          : [];
      const linked = (commandes?.length ?? 0) > 0;
      return {
        id: r.id,
        nomFichier: r.nom_fichier,
        volumeMm3: r.volume_mm3,
        devisNumero: d?.numero ?? null,
        clientRaisonSociale: client?.raison_sociale ?? null,
        createdAt: d?.created_at ?? "",
        // La commande herite du numero de devis (convention du reste de l'app).
        commandeNumero: linked ? (d?.numero ?? null) : null,
      };
    }
  );

  // Tri par date de depot (created_at du devis) decroissante.
  files.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return { ok: true, files };
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
