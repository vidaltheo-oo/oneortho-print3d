"use client";

import { useState } from "react";
import {
  WORKFLOW_META,
  WORKFLOW_ORDER,
  workflowStep,
  computeCommandeKpis,
  isInPeriod,
  PERIOD_FILTERS,
  formatEUR2,
  formatEURk,
  formatShort,
  type AdminCommande,
  type CommandeStatut,
  type WorkflowStep,
  type Period,
} from "@/lib/admin";
import StlFilesPanel from "./StlFilesPanel";
import styles from "./admin.module.css";

const GRID = "150px 84px 1.4fr 48px 112px 1fr 92px 168px";

type SortKey = "numero" | "date" | "client" | "montant" | "statut" | "updated";
type SortDir = "asc" | "desc";

const STATUS_FILTERS: { key: "tous" | WorkflowStep; label: string }[] = [
  { key: "tous", label: "Toutes" },
  { key: "nouveau", label: "Nouveau" },
  { key: "valide", label: "Validé" },
  { key: "en_production", label: "En production" },
  { key: "expediee", label: "Expédiée" },
  { key: "livree", label: "Livrée" },
];

function initials(name: string | null | undefined): string {
  if (!name) return "??";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "??"
  );
}

export default function AdminCommandes({
  commandes,
  onUpdate,
}: {
  commandes: AdminCommande[];
  onUpdate: (id: string, statut: CommandeStatut) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filesOf, setFilesOf] = useState<{ devisId: string; numero: string } | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"tous" | WorkflowStep>("tous");
  const [period, setPeriod] = useState<Period>("tout");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const now = new Date();
  const kpis = computeCommandeKpis(commandes, now);

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
    setPeriod("tout");
  }

  const q = query.trim().toLowerCase();
  const filtered = commandes.filter((c) => {
    const step = workflowStep(c.devisStatut, c.statut);
    if (status !== "tous" && step !== status) return false;
    if (!isInPeriod(c.createdAt, period, now)) return false;
    if (q) {
      const hay = `${c.numero} ${c.client?.raison_sociale ?? ""} ${
        c.client?.email ?? ""
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
      case "statut":
        return (
          (WORKFLOW_ORDER[workflowStep(a.devisStatut, a.statut)] -
            WORKFLOW_ORDER[workflowStep(b.devisStatut, b.statut)]) *
          dir
        );
      case "updated":
        return (
          (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) *
          dir
        );
      default:
        return 0;
    }
  });

  async function act(id: string, statut: CommandeStatut) {
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
      <div className={styles.kpiGrid}>
        <div className={styles.kpi} style={{ borderLeftColor: "#FF6C4F" }}>
          <div className={styles.kpiLbl}>À lancer en production</div>
          <div className={styles.kpiVal}>{kpis.aLancer}</div>
        </div>
        <div className={styles.kpi} style={{ borderLeftColor: "#1565C0" }}>
          <div className={styles.kpiLbl}>En production</div>
          <div className={styles.kpiVal}>{kpis.enProduction}</div>
        </div>
        <div className={styles.kpi} style={{ borderLeftColor: "#6A1B9A" }}>
          <div className={styles.kpiLbl}>Expédiées ce mois</div>
          <div className={styles.kpiVal}>{kpis.expedieesMois}</div>
        </div>
        <div className={`${styles.kpi} ${styles.kpiDark}`}>
          <div className={styles.kpiLbl}>CA en production (HT)</div>
          <div className={styles.kpiVal}>{formatEURk(kpis.caProduction)}</div>
        </div>
      </div>

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
            placeholder="Client ou n° de commande…"
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
        {rows.length} commande{rows.length > 1 ? "s" : ""}
      </div>

      <div className={styles.table}>
        <div className={styles.tHead} style={{ gridTemplateColumns: GRID }}>
          {th("N° commande", "numero")}
          {th("Date", "date")}
          {th("Client", "client")}
          <div className={styles.th}>STL</div>
          {th("Montant HT", "montant", true)}
          {th("Statut", "statut")}
          {th("Mis à jour", "updated")}
          <div className={styles.th} style={{ textAlign: "right" }}>
            Actions
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Aucune commande</div>
            <div className={styles.emptyMsg}>
              Aucune commande ne correspond à ces filtres.
            </div>
          </div>
        ) : (
          rows.map((c) => {
            const step = workflowStep(c.devisStatut, c.statut);
            const meta = WORKFLOW_META[step];
            // Action gardee : on ne saute pas d'etape. Le lancement en production
            // n'est propose qu'apres validation du devis (etape "valide").
            const next: { to: CommandeStatut; label: string } | null =
              step === "valide"
                ? { to: "en_production", label: "Lancer la production" }
                : c.statut === "en_production"
                  ? { to: "expediee", label: "Marquer expédiée" }
                  : c.statut === "expediee"
                    ? { to: "livree", label: "Marquer livrée" }
                    : null;
            return (
              <div
                key={c.id}
                className={styles.tRow}
                style={{ gridTemplateColumns: GRID, cursor: c.devisId ? "pointer" : "default" }}
                onClick={() =>
                  c.devisId && setFilesOf({ devisId: c.devisId, numero: c.numero })
                }
              >
                <div className={`${styles.td} ${styles.cellStrong}`}>{c.numero}</div>
                <div className={styles.td}>{formatShort(c.createdAt)}</div>
                <div className={styles.td} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={styles.sideAvatar} style={{ width: 30, height: 30, fontSize: 11 }}>
                    {initials(c.client?.raison_sociale)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.cellName}>
                      {c.client?.raison_sociale ?? "—"}
                    </div>
                    <div className={styles.cellEmail}>{c.client?.email ?? ""}</div>
                  </div>
                </div>
                <div className={styles.td}>{c.filesCount}</div>
                <div className={`${styles.td} ${styles.cellAmount}`}>
                  {formatEUR2(c.montantHt)}
                </div>
                <div className={styles.td}>
                  <span className={styles.badge} style={{ background: meta.bg, color: meta.fg }}>
                    {meta.label}
                  </span>
                </div>
                <div className={styles.td}>{formatShort(c.updatedAt)}</div>
                <div className={styles.td}>
                  <div className={styles.rowActions}>
                    {next ? (
                      <button
                        type="button"
                        className={styles.actBtn}
                        disabled={busyId === c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          act(c.id, next.to);
                        }}
                      >
                        {next.label}
                      </button>
                    ) : step === "nouveau" ? (
                      <span className={styles.cellEmail}>
                        À valider dans Devis
                      </span>
                    ) : null}
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
