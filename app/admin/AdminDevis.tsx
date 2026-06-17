"use client";

import { useState, type ReactNode } from "react";
import {
  NATURE_LABELS,
  DELAI_LABELS,
  FINITION_LABELS,
  COULEUR_LABELS,
  LIVRAISON_LABELS,
  labelOf,
} from "@/lib/cart";
import {
  WORKFLOW_META,
  WORKFLOW_ORDER,
  DELAI_ORDER,
  workflowStep,
  isInPeriod,
  PERIOD_FILTERS,
  formatEUR2,
  formatShort,
  type AdminDevis as AdminDevisType,
  type DevisStatut,
  type WorkflowStep,
  type Period,
} from "@/lib/admin";
import StlFilesPanel from "./StlFilesPanel";
import OuiNon from "./OuiNon";
import styles from "./admin.module.css";

type SortKey = "numero" | "date" | "client" | "montant" | "delai" | "statut";
type SortDir = "asc" | "desc";

type Column = {
  key: string;
  label: string;
  sortKey?: SortKey;
  // Largeur repliee (peut utiliser fr) et largeur depliee (px, scroll horizontal).
  w: string;
  we?: string;
  extra?: boolean;
  alignRight?: boolean;
  render: (d: AdminDevisType, step: WorkflowStep) => ReactNode;
};

const STATUS_FILTERS: { key: "tous" | WorkflowStep; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "nouveau", label: "Nouveau" },
  { key: "valide", label: "Validé" },
  { key: "en_production", label: "En production" },
  { key: "expediee", label: "Expédiée" },
  { key: "livree", label: "Livrée" },
  { key: "refuse", label: "Refusé" },
];

const DELAI_FILTERS: { key: "tous" | string; label: string }[] = [
  { key: "tous", label: "Tous délais" },
  { key: "std", label: "Standard" },
  { key: "pri", label: "Priority" },
  { key: "exp", label: "Express" },
];

export default function AdminDevis({
  devis,
  onUpdate,
}: {
  devis: AdminDevisType[];
  onUpdate: (id: string, statut: DevisStatut) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filesOf, setFilesOf] = useState<{ devisId: string; numero: string } | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"tous" | WorkflowStep>("tous");
  const [delai, setDelai] = useState<"tous" | string>("tous");
  const [period, setPeriod] = useState<Period>("tout");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState(false);

  const now = new Date();

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function resetFilters() {
    setQuery("");
    setStatus("tous");
    setDelai("tous");
    setPeriod("tout");
  }

  async function act(id: string, statut: DevisStatut) {
    setBusyId(id);
    await onUpdate(id, statut);
    setBusyId(null);
  }

  const q = query.trim().toLowerCase();
  const filtered = devis.filter((d) => {
    const step = workflowStep(d.statut, d.commandeStatut);
    if (status !== "tous" && step !== status) return false;
    if (delai !== "tous" && d.delai !== delai) return false;
    if (!isInPeriod(d.createdAt, period, now)) return false;
    if (q) {
      const hay = `${d.numero} ${d.client?.raison_sociale ?? ""} ${
        d.client?.email ?? ""
      }`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const dir = sortDir === "asc" ? 1 : -1;
  const rows = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "numero":
        return a.numero.localeCompare(b.numero, "fr") * dir;
      case "date":
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          dir
        );
      case "client":
        return (
          (a.client?.raison_sociale ?? "").localeCompare(
            b.client?.raison_sociale ?? "",
            "fr"
          ) * dir
        );
      case "montant":
        return (a.montantHt - b.montantHt) * dir;
      case "delai":
        return (
          ((DELAI_ORDER[a.delai ?? ""] ?? 99) -
            (DELAI_ORDER[b.delai ?? ""] ?? 99)) *
          dir
        );
      case "statut":
        return (
          (WORKFLOW_ORDER[workflowStep(a.statut, a.commandeStatut)] -
            WORKFLOW_ORDER[workflowStep(b.statut, b.commandeStatut)]) *
          dir
        );
      default:
        return 0;
    }
  });

  const columns: Column[] = [
    {
      key: "numero",
      label: "N° devis",
      sortKey: "numero",
      w: "150px",
      render: (d) => (
        <span className={styles.cellStrong}>{d.numero}</span>
      ),
    },
    {
      key: "date",
      label: "Date",
      sortKey: "date",
      w: "80px",
      render: (d) => formatShort(d.createdAt),
    },
    {
      key: "client",
      label: "Client",
      sortKey: "client",
      w: "1.6fr",
      we: "200px",
      render: (d) => (
        <>
          <div className={styles.cellName}>
            {d.client?.raison_sociale ?? "—"}
          </div>
          <div className={styles.cellEmail}>{d.client?.email ?? ""}</div>
        </>
      ),
    },
    {
      key: "stl",
      label: "STL",
      w: "52px",
      render: (d) => d.filesCount,
    },
    {
      key: "nature",
      label: "Nature",
      w: "1.1fr",
      we: "130px",
      render: (d) => labelOf(NATURE_LABELS, d.natureApplication),
    },
    {
      key: "montant",
      label: "Montant HT",
      sortKey: "montant",
      w: "110px",
      alignRight: true,
      render: (d) => (
        <span className={styles.cellAmount}>{formatEUR2(d.montantHt)}</span>
      ),
    },
    {
      key: "delai",
      label: "Délai",
      sortKey: "delai",
      w: "96px",
      render: (d) => labelOf(DELAI_LABELS, d.delai),
    },
    {
      key: "statut",
      label: "Statut",
      sortKey: "statut",
      w: "1fr",
      we: "120px",
      render: (_d, step) => {
        const meta = WORKFLOW_META[step];
        return (
          <span
            className={styles.badge}
            style={{ background: meta.bg, color: meta.fg }}
          >
            {meta.label}
          </span>
        );
      },
    },
    // ----- Colonnes optionnelles (masquees par defaut) -----
    {
      key: "finition",
      label: "Finition",
      w: "120px",
      extra: true,
      render: (d) => labelOf(FINITION_LABELS, d.finition),
    },
    {
      key: "couleur",
      label: "Couleur",
      w: "90px",
      extra: true,
      render: (d) => labelOf(COULEUR_LABELS, d.couleur),
    },
    {
      key: "teinture",
      label: "Teinture",
      w: "100px",
      extra: true,
      render: (d) => <OuiNon value={d.teintureTotal > 0} />,
    },
    {
      key: "nettoyage",
      label: "Nettoyage / Emballage",
      w: "150px",
      extra: true,
      render: (d) => <OuiNon value={d.nettoyage} />,
    },
    {
      key: "dossier",
      label: "Dossier de lot",
      w: "130px",
      extra: true,
      render: (d) => <OuiNon value={d.dossierLot} />,
    },
    {
      key: "livraison",
      label: "Livraison",
      w: "100px",
      extra: true,
      render: (d) => labelOf(LIVRAISON_LABELS, d.livraison),
    },
    {
      key: "actions",
      label: "Actions",
      w: "132px",
      alignRight: true,
      render: (d, step) => (
        <div className={styles.rowActions}>
          {/* Etape 1 -> 2 : validation du devis avant toute production. */}
          {step === "nouveau" && (
            <>
              <button
                type="button"
                className={`${styles.actBtn} ${styles.actBtnValidate}`}
                disabled={busyId === d.id}
                onClick={(e) => {
                  e.stopPropagation();
                  act(d.id, "accepte");
                }}
              >
                Valider
              </button>
              <button
                type="button"
                className={`${styles.actBtn} ${styles.actBtnRefuse}`}
                disabled={busyId === d.id}
                onClick={(e) => {
                  e.stopPropagation();
                  act(d.id, "refuse");
                }}
              >
                Refuser
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const visible = expanded ? columns : columns.filter((c) => !c.extra);
  const grid = visible
    .map((c) => (expanded ? c.we ?? c.w : c.w))
    .join(" ");

  return (
    <>
      <div className={styles.filterBar}>
        <div className={styles.search} style={{ maxWidth: 320 }}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Client ou n° de devis…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="button" className={styles.resetBtn} onClick={resetFilters}>
          Réinitialiser les filtres
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Statut</span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.pill} ${status === f.key ? styles.pillActive : ""}`}
              onClick={() => setStatus(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Délai</span>
          {DELAI_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.pill} ${delai === f.key ? styles.pillActive : ""}`}
              onClick={() => setDelai(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Période</span>
          {PERIOD_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.pill} ${period === f.key ? styles.pillActive : ""}`}
              onClick={() => setPeriod(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableTools}>
        <span className={styles.count}>
          {rows.length} devis{rows.length > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          className={styles.moreBtn}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Afficher moins" : "Afficher plus d’options"}
        </button>
      </div>

      <div className={styles.tableScroll}>
        <div
          className={styles.table}
          style={{ width: expanded ? "max-content" : undefined, minWidth: "100%" }}
        >
          <div className={styles.tHead} style={{ gridTemplateColumns: grid }}>
            {visible.map((c) =>
              c.sortKey ? (
                <button
                  key={c.key}
                  type="button"
                  className={`${styles.th} ${styles.thSort} ${
                    sortKey === c.sortKey ? styles.thActive : ""
                  }`}
                  onClick={() => toggleSort(c.sortKey!)}
                  style={c.alignRight ? { justifyContent: "flex-end" } : undefined}
                >
                  {c.label}
                  <span className={styles.sortArrow}>
                    {sortKey === c.sortKey ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </span>
                </button>
              ) : (
                <div
                  key={c.key}
                  className={styles.th}
                  style={c.alignRight ? { textAlign: "right" } : undefined}
                >
                  {c.label}
                </div>
              )
            )}
          </div>

          {rows.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>Aucun devis</div>
              <div className={styles.emptyMsg}>
                Aucun devis ne correspond à ces filtres.
              </div>
            </div>
          ) : (
            rows.map((d) => {
              const step = workflowStep(d.statut, d.commandeStatut);
              return (
                <div
                  key={d.id}
                  className={styles.tRow}
                  style={{ gridTemplateColumns: grid, cursor: "pointer" }}
                  onClick={() => setFilesOf({ devisId: d.id, numero: d.numero })}
                >
                  {visible.map((c) => (
                    <div
                      key={c.key}
                      className={styles.td}
                      style={c.alignRight ? { textAlign: "right" } : undefined}
                    >
                      {c.render(d, step)}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {filesOf && (
        <StlFilesPanel
          devisId={filesOf.devisId}
          numero={filesOf.numero}
          onClose={() => setFilesOf(null)}
        />
      )}
    </>
  );
}
