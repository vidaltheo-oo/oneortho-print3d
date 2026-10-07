"use client";

import { useState } from "react";
import { deleteStlFiles, formatDateFr, type AdminStlFile } from "@/lib/admin";
import StlFileDetail from "./StlFileDetail";
import styles from "./admin.module.css";

const GRID = "2fr 1.5fr 130px 120px 130px 150px";

type StockFilter = "tous" | "plateforme" | "supprimes";

const STOCK_FILTERS: { key: StockFilter; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "plateforme", label: "Sur la plateforme" },
  { key: "supprimes", label: "Supprimés" },
];

function formatVolume(mm3: number | null): string {
  if (mm3 == null || !Number.isFinite(mm3)) return "—";
  return `${Math.round(mm3).toLocaleString("fr-FR")} mm³`;
}

// Zone tampon : les STL sont telecharges par l'atelier puis supprimes de la
// plateforme (archivage hors ONE PRINT).
export default function AdminStl({
  files,
  onChanged,
}: {
  files: AdminStlFile[];
  onChanged: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState<StockFilter>("tous");
  const [selected, setSelected] = useState<AdminStlFile | null>(null);
  const [purging, setPurging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const rows = files.filter((f) => {
    if (stock === "plateforme" && f.supprimeLe) return false;
    if (stock === "supprimes" && !f.supprimeLe) return false;
    if (!q) return true;
    return (
      f.nomFichier.toLowerCase().includes(q) ||
      (f.clientRaisonSociale ?? "").toLowerCase().includes(q)
    );
  });

  // Purge groupee : uniquement les fichiers deja telecharges, encore presents.
  const purgeables = files.filter((f) => f.telechargeLe && !f.supprimeLe);

  async function purger() {
    if (purgeables.length === 0) return;
    const ok = window.confirm(
      `Supprimer de la plateforme ${purgeables.length} fichier${
        purgeables.length > 1 ? "s" : ""
      } STL déjà téléchargé${purgeables.length > 1 ? "s" : ""} ? Cette action est définitive.`
    );
    if (!ok) return;
    setPurging(true);
    setError(null);
    const res = await deleteStlFiles(purgeables);
    if (!res.ok) setError(res.message ?? "Échec de la suppression.");
    await onChanged();
    setPurging(false);
  }

  return (
    <>
      <div className={styles.filterBar}>
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
        <button
          type="button"
          className={`${styles.actBtn} ${styles.actBtnRefuse}`}
          onClick={purger}
          disabled={purging || purgeables.length === 0}
          title="Supprime du stockage les fichiers déjà téléchargés"
        >
          {purging
            ? "Suppression…"
            : `Supprimer les fichiers téléchargés (${purgeables.length})`}
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Stockage</span>
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.pill} ${stock === f.key ? styles.pillActive : ""}`}
              onClick={() => setStock(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className={styles.gateError} style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

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
          <div className={styles.th}>Stockage</div>
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
              style={{ gridTemplateColumns: GRID, cursor: "pointer" }}
              onClick={() => setSelected(f)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(f);
                }
              }}
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
              <div className={styles.td}>
                <StockageCell file={f} />
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <StlFileDetail
          file={selected}
          onClose={() => setSelected(null)}
          onChanged={onChanged}
        />
      )}
    </>
  );
}

function StockageCell({ file }: { file: AdminStlFile }) {
  if (file.supprimeLe) {
    return (
      <div style={{ minWidth: 0 }}>
        <span className={styles.badge} style={{ background: "#ECEFF1", color: "#546E7A" }}>
          Supprimé
        </span>
        <div className={styles.cellEmail}>le {formatDateFr(file.supprimeLe)}</div>
      </div>
    );
  }
  return (
    <div style={{ minWidth: 0 }}>
      <span className={styles.badge} style={{ background: "#E8F5E9", color: "#004B32" }}>
        Sur la plateforme
      </span>
      <div className={styles.cellEmail}>
        {file.telechargeLe
          ? `Téléchargé le ${formatDateFr(file.telechargeLe)}`
          : "Pas encore téléchargé"}
      </div>
    </div>
  );
}
