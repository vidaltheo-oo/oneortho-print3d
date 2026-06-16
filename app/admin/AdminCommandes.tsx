"use client";

import { useState } from "react";
import { DELAI_LABELS, labelOf } from "@/lib/cart";
import {
  WORKFLOW_META,
  workflowStep,
  computeCommandeKpis,
  formatEUR2,
  formatEURk,
  formatShort,
  type AdminCommande,
  type CommandeStatut,
  type WorkflowStep,
} from "@/lib/admin";
import styles from "./admin.module.css";

const GRID = "150px 84px 1.5fr 50px 116px 92px 1fr 168px";

const FILTERS: { key: "tous" | WorkflowStep; label: string }[] = [
  { key: "tous", label: "Toutes" },
  { key: "nouveau", label: "Nouveau" },
  { key: "valide", label: "Validé" },
  { key: "en_production", label: "En production" },
  { key: "expediee", label: "Expédiées" },
  { key: "livree", label: "Livrées" },
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
  const [filter, setFilter] = useState<"tous" | WorkflowStep>("tous");
  const [busyId, setBusyId] = useState<string | null>(null);
  const now = new Date();
  const kpis = computeCommandeKpis(commandes, now);

  const rows = commandes.filter(
    (c) =>
      filter === "tous" || workflowStep(c.devisStatut, c.statut) === filter
  );

  async function act(id: string, statut: CommandeStatut) {
    setBusyId(id);
    await onUpdate(id, statut);
    setBusyId(null);
  }

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

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`${styles.pill} ${filter === f.key ? styles.pillActive : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.count}>{rows.length} commande{rows.length > 1 ? "s" : ""}</div>

      <div className={styles.table}>
        <div className={styles.tHead} style={{ gridTemplateColumns: GRID }}>
          <div className={styles.th}>N° commande</div>
          <div className={styles.th}>Validée</div>
          <div className={styles.th}>Client</div>
          <div className={styles.th}>STL</div>
          <div className={styles.th}>Montant HT</div>
          <div className={styles.th}>Délai</div>
          <div className={styles.th}>Statut</div>
          <div className={styles.th} style={{ textAlign: "right" }}>
            Actions
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Aucune commande</div>
            <div className={styles.emptyMsg}>
              Aucune commande ne correspond à ce filtre.
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
              <div key={c.id} className={styles.tRow} style={{ gridTemplateColumns: GRID }}>
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
                    <div className={styles.cellEmail}>{c.numero}</div>
                  </div>
                </div>
                <div className={styles.td}>{c.filesCount}</div>
                <div className={`${styles.td} ${styles.cellAmount}`}>
                  {formatEUR2(c.montantHt)}
                </div>
                <div className={styles.td}>{labelOf(DELAI_LABELS, c.delai)}</div>
                <div className={styles.td}>
                  <span className={styles.badge} style={{ background: meta.bg, color: meta.fg }}>
                    {meta.label}
                  </span>
                </div>
                <div className={styles.td}>
                  <div className={styles.rowActions}>
                    {next ? (
                      <button
                        type="button"
                        className={styles.actBtn}
                        disabled={busyId === c.id}
                        onClick={() => act(c.id, next.to)}
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
    </>
  );
}
