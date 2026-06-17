"use client";

import { useState } from "react";
import { NATURE_LABELS, DELAI_LABELS, labelOf } from "@/lib/cart";
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
import styles from "./admin.module.css";

const GRID = "150px 80px 1.6fr 52px 1.1fr 110px 96px 1fr 132px";

type SortKey = "numero" | "date" | "client" | "montant" | "delai" | "statut";
type SortDir = "asc" | "desc";

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

  async function act(id: string, statut: DevisStatut) {
    setBusyId(id);
    await onUpdate(id, statut);
    setBusyId(null);
  }

  const th = (label: string, key: SortKey, alignRight = false) => (
    <button
      type="button"
      className={`${styles.th} ${styles.thSort} ${
        sortKey === key ? styles.thActive : ""
      }`}
      onClick={() => toggleSort(key)}
      style={alignRight ? { justifyContent: "flex-end" } : undefined}
    >
      {label}
      <span className={styles.sortArrow}>
        {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : ""}
      </span>
    </button>
  );

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

      <div className={styles.count}>
        {rows.length} devis{rows.length > 1 ? "s" : ""}
      </div>

      <div className={styles.table}>
        <div className={styles.tHead} style={{ gridTemplateColumns: GRID }}>
          {th("N° devis", "numero")}
          {th("Date", "date")}
          {th("Client", "client")}
          <div className={styles.th}>STL</div>
          <div className={styles.th}>Nature</div>
          {th("Montant HT", "montant", true)}
          {th("Délai", "delai")}
          {th("Statut", "statut")}
          <div className={styles.th} style={{ textAlign: "right" }}>
            Actions
          </div>
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
            const meta = WORKFLOW_META[step];
            return (
              <div
                key={d.id}
                className={styles.tRow}
                style={{ gridTemplateColumns: GRID, cursor: "pointer" }}
                onClick={() => setFilesOf({ devisId: d.id, numero: d.numero })}
              >
                <div className={`${styles.td} ${styles.cellStrong}`}>{d.numero}</div>
                <div className={styles.td}>{formatShort(d.createdAt)}</div>
                <div className={styles.td}>
                  <div className={styles.cellName}>
                    {d.client?.raison_sociale ?? "—"}
                  </div>
                  <div className={styles.cellEmail}>{d.client?.email ?? ""}</div>
                </div>
                <div className={styles.td}>{d.filesCount}</div>
                <div className={styles.td}>
                  {labelOf(NATURE_LABELS, d.natureApplication)}
                </div>
                <div className={`${styles.td} ${styles.cellAmount}`}>
                  {formatEUR2(d.montantHt)}
                </div>
                <div className={styles.td}>{labelOf(DELAI_LABELS, d.delai)}</div>
                <div className={styles.td}>
                  <span
                    className={styles.badge}
                    style={{ background: meta.bg, color: meta.fg }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className={styles.td}>
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
                </div>
              </div>
            );
          })
        )}
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
