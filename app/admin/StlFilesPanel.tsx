"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { labelOf, COULEUR_LABELS, FINITION_LABELS } from "@/lib/cart";
import { fetchDevisPieces, signedStlUrl, type AdminPiece } from "@/lib/admin";
import styles from "./admin.module.css";

// Le viewer (three.js) n'est charge qu'a l'ouverture (chunk dedie, pas de SSR).
const StlViewer = dynamic(() => import("./StlViewer"), { ssr: false });

export default function StlFilesPanel({
  devisId,
  numero,
  onClose,
}: {
  devisId: string;
  numero: string;
  onClose: () => void;
}) {
  const [pieces, setPieces] = useState<AdminPiece[] | null>(null);
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(
    null
  );
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDevisPieces(devisId).then((res) => {
      if (!cancelled) setPieces(res);
    });
    return () => {
      cancelled = true;
    };
  }, [devisId]);

  async function visualiser(p: AdminPiece) {
    if (!p.storagePath) return;
    setBusy(p.nomFichier);
    const url = await signedStlUrl(p.storagePath, { expiresIn: 3600 });
    setBusy(null);
    if (url) setViewer({ url, title: p.nomFichier });
  }

  async function telecharger(p: AdminPiece) {
    if (!p.storagePath) return;
    setBusy(p.nomFichier);
    // URL signee valable 1 heure, en mode telechargement.
    const url = await signedStlUrl(p.storagePath, {
      expiresIn: 3600,
      download: p.nomFichier,
    });
    setBusy(null);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = p.nomFichier;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHead}>
          <div style={{ minWidth: 0 }}>
            <div className={styles.drawerTitle}>{numero}</div>
            <div className={styles.drawerSub}>Fichiers STL</div>
          </div>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Fermer"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {pieces === null ? (
          <div className={styles.drawerMuted}>Chargement…</div>
        ) : pieces.length === 0 ? (
          <div className={styles.drawerMuted}>Aucune pièce sur ce devis.</div>
        ) : (
          <div className={styles.fileList}>
            {pieces.map((p, i) => (
              <div key={i} className={styles.fileRow}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.cellName}>{p.nomFichier}</div>
                  <div className={styles.cellEmail}>
                    PA2200 · {labelOf(COULEUR_LABELS, p.couleur)} ·{" "}
                    {labelOf(FINITION_LABELS, p.finition)} · ×{p.quantite}
                    {p.volumeMm3 != null
                      ? ` · ${Math.round(p.volumeMm3).toLocaleString("fr-FR")} mm³`
                      : ""}
                  </div>
                </div>
                {p.storagePath ? (
                  <div className={styles.fileBtns}>
                    <button
                      type="button"
                      className={styles.actBtn}
                      disabled={busy === p.nomFichier}
                      onClick={() => visualiser(p)}
                    >
                      Visualiser
                    </button>
                    <button
                      type="button"
                      className={styles.actBtn}
                      disabled={busy === p.nomFichier}
                      onClick={() => telecharger(p)}
                    >
                      Télécharger
                    </button>
                  </div>
                ) : (
                  <span className={styles.cellEmail}>Fichier non disponible</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={styles.retentionNote}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="8" />
            <path d="M10 9v4M10 6.5v.5" />
          </svg>
          Les fichiers STL sont conservés tant que la commande est active. Ils
          peuvent être supprimés une fois la commande livrée ou annulée.
        </div>
      </aside>

      {viewer && (
        <StlViewer
          url={viewer.url}
          title={viewer.title}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
