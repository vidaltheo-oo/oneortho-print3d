"use client";

import { useState } from "react";
import { formatDateFr, type AdminStlFile } from "@/lib/admin";
import styles from "./admin.module.css";

const GRID = "2fr 1.5fr 130px 120px 130px";

function formatVolume(mm3: number | null): string {
  if (mm3 == null || !Number.isFinite(mm3)) return "—";
  return `${Math.round(mm3).toLocaleString("fr-FR")} mm³`;
}

export default function AdminStl({ files }: { files: AdminStlFile[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const rows = q
    ? files.filter(
        (f) =>
          f.nomFichier.toLowerCase().includes(q) ||
          (f.clientRaisonSociale ?? "").toLowerCase().includes(q)
      )
    : files;

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.search} style={{ maxWidth: 360 }}>
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
            placeholder="Rechercher par fichier ou client…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.count}>
        {rows.length} fichier{rows.length > 1 ? "s" : ""} STL
      </div>

      <div className={styles.table}>
        <div className={styles.tHead} style={{ gridTemplateColumns: GRID }}>
          <div className={styles.th}>Nom du fichier</div>
          <div className={styles.th}>Client</div>
          <div className={styles.th}>Volume</div>
          <div className={styles.th}>Dépôt</div>
          <div className={styles.th}>Commande</div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Aucun fichier STL</div>
            <div className={styles.emptyMsg}>
              Aucun fichier ne correspond à cette recherche.
            </div>
          </div>
        ) : (
          rows.map((f) => (
            <div
              key={f.id}
              className={styles.tRow}
              style={{ gridTemplateColumns: GRID }}
            >
              <div
                className={styles.td}
                style={{ display: "flex", alignItems: "center", gap: 9 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3 21 8v8l-9 5-3-1.7"
                    stroke="#004B32"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 3 3 8v8l9 5M12 3v18M3 8l9 5 9-5"
                    stroke="#004B32"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span className={styles.cellStrong}>{f.nomFichier}</span>
              </div>
              <div className={styles.td}>{f.clientRaisonSociale ?? "—"}</div>
              <div className={styles.td}>{formatVolume(f.volumeMm3)}</div>
              <div className={styles.td}>{formatDateFr(f.createdAt)}</div>
              <div className={styles.td}>
                {f.commandeNumero ? (
                  <span className={styles.cellStrong}>{f.commandeNumero}</span>
                ) : (
                  <span className={styles.drawerMuted}>—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
