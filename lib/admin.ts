import { supabase } from "./supabaseClient";
import { STL_BUCKET } from "./checkout";

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
  updatedAt: string;
  devisId: string | null;
  // Statut du devis lie : le lancement en production exige un devis valide.
  devisStatut: DevisStatut | null;
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

// ---------- Workflow unifie (devis + commande) ----------
// Le checkout cree un devis (envoye) ET une commande (en_attente). Le cycle de
// vie reel se lit en combinant les deux statuts en 5 etapes :
//   nouveau -> valide -> en_production -> expediee -> livree
// Etapes 1-2 pilotees dans /admin/devis (validation), 3-5 dans /admin/commandes.
export type WorkflowStep =
  | "nouveau"
  | "valide"
  | "en_production"
  | "expediee"
  | "livree"
  | "refuse"
  | "annulee";

export const WORKFLOW_META: Record<WorkflowStep, BadgeMeta> = {
  nouveau: { label: "Nouveau", bg: "#FFF3E0", fg: "#FF6C4F" },
  valide: { label: "Validé", bg: "#E8F5E9", fg: "#004B32" },
  en_production: { label: "En production", bg: "#E3F2FD", fg: "#1565C0" },
  expediee: { label: "Expédiée", bg: "#F3E5F5", fg: "#6A1B9A" },
  livree: { label: "Livrée", bg: "#E8F5E9", fg: "#004B32" },
  refuse: { label: "Refusé", bg: "#FDEAEA", fg: "#C62828" },
  annulee: { label: "Annulée", bg: "#FDEAEA", fg: "#C62828" },
};

// Etape effective a partir des deux statuts. Une commande avancee (production,
// expediee, livree, annulee) prime ; sinon l'etat depend de la validation devis.
export function workflowStep(
  devisStatut: DevisStatut | null,
  commandeStatut: CommandeStatut | null
): WorkflowStep {
  if (commandeStatut === "en_production") return "en_production";
  if (commandeStatut === "expediee") return "expediee";
  if (commandeStatut === "livree") return "livree";
  if (commandeStatut === "annulee") return "annulee";
  if (devisStatut === "refuse") return "refuse";
  if (devisStatut === "accepte") return "valide";
  return "nouveau";
}

// Ordre des etapes pour le tri par statut.
export const WORKFLOW_ORDER: Record<WorkflowStep, number> = {
  nouveau: 0,
  valide: 1,
  en_production: 2,
  expediee: 3,
  livree: 4,
  refuse: 5,
  annulee: 6,
};

// Ordre des delais pour le tri (Standard < Priority < Express).
export const DELAI_ORDER: Record<string, number> = { std: 0, pri: 1, exp: 2 };

// ---------- Filtre par periode ----------
export type Period = "semaine" | "mois" | "trimestre" | "tout";

export const PERIOD_FILTERS: { key: Period; label: string }[] = [
  { key: "semaine", label: "Cette semaine" },
  { key: "mois", label: "Ce mois" },
  { key: "trimestre", label: "3 mois" },
  { key: "tout", label: "Tout" },
];

// Fenetres glissantes (jours) ramenees a maintenant.
export function isInPeriod(iso: string, period: Period, now: Date): boolean {
  if (period === "tout") return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const days = (now.getTime() - d.getTime()) / 86400000;
  if (period === "semaine") return days <= 7;
  if (period === "mois") return days <= 31;
  if (period === "trimestre") return days <= 92;
  return true;
}

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
  updated_at: string;
  devis_id: string | null;
  clients: DevisJoin | DevisJoin[] | null;
  devis:
    | {
        numero: string | null;
        statut: DevisStatut | null;
        montant_ht: number | null;
        montant_ttc: number | null;
        delai: string | null;
        nature_application: string | null;
        devis_pieces: { quantite: number | null }[] | null;
      }
    | null
    | Array<{
        numero: string | null;
        statut: DevisStatut | null;
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
      "id, statut, created_at, updated_at, devis_id, clients:client_id ( raison_sociale, email ), devis:devis_id ( numero, statut, montant_ht, montant_ttc, delai, nature_application, devis_pieces ( quantite ) )"
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
      updatedAt: r.updated_at,
      devisId: r.devis_id,
      devisStatut: d?.statut ?? null,
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

// ---------- Fichiers STL d'un devis (panneau detail admin) ----------

export type AdminPiece = {
  nomFichier: string;
  storagePath: string | null;
  volumeMm3: number | null;
  quantite: number;
  couleur: string | null;
  finition: string | null;
};

type PieceRow = {
  nom_fichier: string;
  storage_path: string | null;
  volume_mm3: number | null;
  quantite: number | null;
  couleur: string | null;
  finition: string | null;
};

export async function fetchDevisPieces(devisId: string): Promise<AdminPiece[]> {
  const { data, error } = await supabase
    .from("devis_pieces")
    .select("nom_fichier, storage_path, volume_mm3, quantite, couleur, finition")
    .eq("devis_id", devisId);
  if (error) return [];
  return ((data as PieceRow[] | null) ?? []).map((r) => ({
    nomFichier: r.nom_fichier,
    storagePath: r.storage_path,
    volumeMm3: r.volume_mm3,
    quantite: r.quantite ?? 1,
    couleur: r.couleur,
    finition: r.finition,
  }));
}

// URL signee (RLS : admin autorise en lecture). expiresIn en secondes.
// `download` force le telechargement (nom de fichier).
export async function signedStlUrl(
  path: string,
  opts?: { expiresIn?: number; download?: string }
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(STL_BUCKET)
    .createSignedUrl(path, opts?.expiresIn ?? 3600, {
      download: opts?.download,
    });
  return data?.signedUrl ?? null;
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
    // "A lancer" = devis valide, commande pas encore en production.
    aLancer: commandes.filter(
      (c) => workflowStep(c.devisStatut, c.statut) === "valide"
    ).length,
    enProduction: commandes.filter((c) => c.statut === "en_production").length,
    expedieesMois: commandes.filter(
      (c) => c.statut === "expediee" && isSameMonth(c.createdAt, now)
    ).length,
    caProduction: commandes
      .filter((c) => c.statut === "en_production")
      .reduce((s, c) => s + c.montantHt, 0),
  };
}
