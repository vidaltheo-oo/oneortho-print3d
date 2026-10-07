"use client";

import { useEffect, useState } from "react";
import {
  computeCa12Months,
  computeDashboardKpis,
  computeStatutRepartition,
  formatEURk,
  formatEUR2,
  DEVIS_STATUT_META,
  DB_QUOTA_BYTES,
  STORAGE_QUOTA_BYTES,
  fetchStorageUsage,
  formatBytes,
  type AdminDevis,
  type StorageUsage,
} from "@/lib/admin";
import styles from "./admin.module.css";

export default function AdminDashboard({
  devis,
  onSeeDevis,
}: {
  devis: AdminDevis[];
  onSeeDevis: () => void;
}) {
  const now = new Date();
  const kpis = computeDashboardKpis(devis, now);
  const rep = computeStatutRepartition(devis);
  const chart = computeCa12Months(devis, now);
  const maxBar = Math.max(1, ...chart.map((c) => c.value));
  const recent = devis.slice(0, 6);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [usageError, setUsageError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchStorageUsage().then((u) => {
      if (cancelled) return;
      if (u) setUsage(u);
      else setUsageError(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className={styles.kpiGrid}>
        <div className={styles.kpi}>
          <div className={styles.kpiLbl}>Devis ce mois</div>
          <div className={styles.kpiVal}>{kpis.devisMois}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLbl}>CA HT (mois)</div>
          <div className={styles.kpiVal}>{formatEURk(kpis.caMois)}</div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLbl}>Conversion</div>
          <div className={styles.kpiVal}>{kpis.conversion}%</div>
        </div>
        <div className={`${styles.kpi} ${styles.kpiDark}`}>
          <div className={styles.kpiLbl}>En attente</div>
          <div className={styles.kpiVal}>{kpis.enAttente}</div>
          <span className={styles.kpiTag}>à valider</span>
        </div>
      </div>

      <div className={styles.panel} style={{ marginBottom: 20 }}>
        <div className={styles.panelTitle}>Chiffre d&apos;affaires HT — 12 mois</div>
        <div className={styles.chartWrap}>
          <div className={styles.chartY}>
            <span>{formatEURk(maxBar)}</span>
            <span>{formatEURk(maxBar / 2)}</span>
            <span>0</span>
          </div>
          <div style={{ flex: 1 }}>
            <div className={styles.chartArea}>
              {chart.map((c, i) => (
                <div
                  key={i}
                  className={`${styles.bar} ${c.current ? styles.barCurrent : ""}`}
                  style={{ height: `${Math.max(2, (c.value / maxBar) * 100)}%` }}
                  title={`${c.label} : ${formatEURk(c.value)}`}
                />
              ))}
            </div>
            <div className={styles.chartX}>
              {chart.map((c, i) => (
                <span
                  key={i}
                  className={`${styles.chartXLbl} ${
                    c.current ? styles.chartXLblCurrent : ""
                  }`}
                >
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>Répartition par statut</div>
          {rep.length === 0 ? (
            <div className={styles.emptyMsg}>Aucun devis pour le moment.</div>
          ) : (
            rep.map((b) => {
              const meta = DEVIS_STATUT_META[b.statut];
              const total = rep.reduce((s, x) => s + x.count, 0);
              return (
                <div key={b.statut} className={styles.repRow}>
                  <span className={styles.repLbl}>{meta.label}</span>
                  <span className={styles.repTrack}>
                    <span
                      className={styles.repFill}
                      style={{
                        width: `${(b.count / total) * 100}%`,
                        background: meta.fg,
                      }}
                    />
                  </span>
                  <span className={styles.repCount}>{b.count}</span>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.panel}>
          <div
            className={styles.panelTitle}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Derniers devis
            <button
              type="button"
              onClick={onSeeDevis}
              style={{
                background: "none",
                border: "none",
                color: "var(--green)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              Tout voir →
            </button>
          </div>
          {recent.length === 0 ? (
            <div className={styles.emptyMsg}>Aucun devis pour le moment.</div>
          ) : (
            recent.map((d) => {
              const meta = DEVIS_STATUT_META[d.statut];
              return (
                <div key={d.id} className={styles.recentItem}>
                  <div className={styles.recentLeft}>
                    <div className={styles.recentNum}>{d.numero}</div>
                    <div className={styles.recentClient}>
                      {d.client?.raison_sociale ?? "—"}
                    </div>
                  </div>
                  <div className={styles.recentRight}>
                    <span className={styles.recentAmount}>
                      {formatEUR2(d.montantHt)}
                    </span>
                    <span
                      className={styles.badge}
                      style={{ background: meta.bg, color: meta.fg }}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={styles.panel} style={{ marginTop: 20 }}>
        <div className={styles.panelTitle}>Capacité Supabase (plan Free)</div>
        {usageError ? (
          <div className={styles.emptyMsg}>Indicateur indisponible.</div>
        ) : !usage ? (
          <div className={styles.emptyMsg}>Chargement…</div>
        ) : (
          <>
            <CapacityRow
              label="Fichiers"
              used={usage.stockageOctets}
              quota={STORAGE_QUOTA_BYTES}
              detail={`${usage.fichiers} fichier${usage.fichiers > 1 ? "s" : ""}`}
            />
            <CapacityRow
              label="Base de données"
              used={usage.baseOctets}
              quota={DB_QUOTA_BYTES}
            />
          </>
        )}
      </div>
    </>
  );
}

// Vert < 70 %, orange < 90 %, rouge au-dela : purger les STL deja telecharges.
function CapacityRow({
  label,
  used,
  quota,
  detail,
}: {
  label: string;
  used: number;
  quota: number;
  detail?: string;
}) {
  const pct = Math.min(100, (used / quota) * 100);
  const color = pct >= 90 ? "#C62828" : pct >= 70 ? "#FF6C4F" : "#004B32";
  return (
    <div className={styles.repRow}>
      <span className={styles.repLbl}>{label}</span>
      <span className={styles.repTrack}>
        <span
          className={styles.repFill}
          style={{ display: "block", width: `${Math.max(pct, 0.5)}%`, background: color }}
        />
      </span>
      <span style={{ flex: "none", fontSize: 13, whiteSpace: "nowrap" }}>
        <strong>{formatBytes(used)}</strong> / {formatBytes(quota)} ·{" "}
        {pct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
        {detail ? ` · ${detail}` : ""}
      </span>
    </div>
  );
}
