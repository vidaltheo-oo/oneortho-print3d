"use client";

import { useState } from "react";
import { NATURE_LABELS, DELAI_LABELS, labelOf } from "@/lib/cart";
import {
  DEVIS_STATUT_META,
  formatEUR2,
  formatShort,
  type AdminDevis as AdminDevisType,
  type DevisStatut,
} from "@/lib/admin";
import styles from "./admin.module.css";

const GRID = "150px 80px 1.6fr 52px 1.1fr 110px 96px 1fr 132px";

const FILTERS: { key: "tous" | DevisStatut; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "envoye", label: "Nouveau" },
  { key: "accepte", label: "Validé" },
  { key: "refuse", label: "Refusé" },
];

export default function AdminDevis({
  devis,
  onUpdate,
}: {
  devis: AdminDevisType[];
  onUpdate: (id: string, statut: DevisStatut) => Promise<void>;
}) {
  const [filter, setFilter] = useState<"tous" | DevisStatut>("tous");
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = devis.filter((d) => filter === "tous" || d.statut === filter);

  async function act(id: string, statut: DevisStatut) {
    setBusyId(id);
    await onUpdate(id, statut);
    setBusyId(null);
  }

  return (
    <>
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

      <div className={styles.count}>
        {rows.length} devis{filter !== "tous" ? ` · ${DEVIS_STATUT_META[filter].label}` : ""}
      </div>

      <div className={styles.table}>
        <div className={styles.tHead} style={{ gridTemplateColumns: GRID }}>
          <div className={styles.th}>N° devis</div>
          <div className={styles.th}>Date</div>
          <div className={styles.th}>Client</div>
          <div className={styles.th}>STL</div>
          <div className={styles.th}>Nature</div>
          <div className={styles.th}>Montant HT</div>
          <div className={styles.th}>Délai</div>
          <div className={styles.th}>Statut</div>
          <div className={styles.th} style={{ textAlign: "right" }}>
            Actions
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Aucun devis</div>
            <div className={styles.emptyMsg}>
              Aucun devis ne correspond à ce filtre.
            </div>
          </div>
        ) : (
          rows.map((d) => {
            const meta = DEVIS_STATUT_META[d.statut];
            return (
              <div key={d.id} className={styles.tRow} style={{ gridTemplateColumns: GRID }}>
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
                    {d.statut === "envoye" && (
                      <>
                        <button
                          type="button"
                          className={`${styles.actBtn} ${styles.actBtnValidate}`}
                          disabled={busyId === d.id}
                          onClick={() => act(d.id, "accepte")}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className={`${styles.actBtn} ${styles.actBtnRefuse}`}
                          disabled={busyId === d.id}
                          onClick={() => act(d.id, "refuse")}
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
    </>
  );
}
