"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  labelOf,
  COULEUR_LABELS,
  FINITION_LABELS,
  DELAI_LABELS,
  NATURE_LABELS,
  LIVRAISON_LABELS,
  LANGUE_LABELS,
  formatEUR,
} from "@/lib/cart";
import {
  fetchDevisDetail,
  signedStlUrl,
  formatDateFr,
  type AdminPiece,
  type AdminDevisDetail,
} from "@/lib/admin";
import OuiNon from "./OuiNon";
import styles from "./admin.module.css";

// Le viewer (three.js) n'est charge qu'a l'ouverture (chunk dedie, pas de SSR).
const StlViewer = dynamic(() => import("./StlViewer"), { ssr: false });

function formatVol(mm3: number | null): string {
  if (mm3 == null || !Number.isFinite(mm3)) return "—";
  return `${Math.round(mm3).toLocaleString("fr-FR")} mm³`;
}

export default function StlFilesPanel({
  devisId,
  numero,
  onClose,
}: {
  devisId: string;
  numero: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminDevisDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(
    null
  );
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetchDevisDetail(devisId).then((res) => {
      if (cancelled) return;
      setDetail(res);
      setLoaded(true);
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

  const pieces = detail?.pieces ?? [];
  // Le configurateur applique finition/couleur a toutes les pieces : niveau devis.
  const teinture = (detail?.teintureTotal ?? 0) > 0;

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHead}>
          <div style={{ minWidth: 0 }}>
            <div className={styles.drawerTitle}>{numero}</div>
            <div className={styles.drawerSub}>Détail du devis</div>
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

        {!loaded ? (
          <div className={styles.drawerMuted}>Chargement…</div>
        ) : !detail ? (
          <div className={styles.drawerMuted}>Devis introuvable.</div>
        ) : (
          <>
            {/* ---------- Pièces ---------- */}
            <div className={styles.drawerSection}>Pièces</div>
            {pieces.length === 0 ? (
              <div className={styles.drawerMuted}>Aucune pièce sur ce devis.</div>
            ) : (
              <div className={styles.fileList}>
                {pieces.map((p, i) => (
                  <div key={i} className={styles.fileRow}>
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.cellName}>{p.nomFichier}</div>
                      <div className={styles.cellEmail}>
                        {formatVol(p.volumeMm3)} · ×{p.quantite} ·{" "}
                        {formatEUR(p.quantite > 0 ? p.prixHt / p.quantite : p.prixHt)}
                        /u
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

            {/* ---------- Options ---------- */}
            <div className={styles.drawerSection}>Options</div>
            <div className={styles.infoList}>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Finition</span>
                <span className={styles.infoValue}>
                  {labelOf(FINITION_LABELS, detail.finition)}
                </span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Couleur</span>
                <span className={styles.infoValue}>
                  {labelOf(COULEUR_LABELS, detail.couleur)}
                </span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Teinture</span>
                <span className={styles.optValue}>
                  <OuiNon value={teinture} />
                  {teinture && (
                    <span className={styles.optAmount}>
                      {formatEUR(detail.teintureTotal)}
                    </span>
                  )}
                </span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Nettoyage</span>
                <OuiNon value={detail.nettoyage} />
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Emballage médical</span>
                <OuiNon value={detail.nettoyage} />
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Dossier de lot ISO 13485</span>
                <OuiNon value={detail.dossierLot} />
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Livraison</span>
                <span className={styles.infoValue}>
                  {labelOf(LIVRAISON_LABELS, detail.livraison)}
                </span>
              </div>
            </div>

            {/* ---------- Tarification ---------- */}
            <div className={styles.drawerSection}>Tarification</div>
            <div className={styles.infoList}>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Sous-total</span>
                <span className={styles.infoValue}>
                  {formatEUR(detail.montantHt + detail.remise)}
                </span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Remise</span>
                <span className={styles.infoValue}>
                  {detail.remise > 0 ? `− ${formatEUR(detail.remise)}` : "—"}
                </span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Total HT</span>
                <span className={styles.infoValue}>{formatEUR(detail.montantHt)}</span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>TVA (20 %)</span>
                <span className={styles.infoValue}>{formatEUR(detail.tva)}</span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Total TTC</span>
                <span className={`${styles.infoValue} ${styles.optTotal}`}>
                  {formatEUR(detail.montantTtc)}
                </span>
              </div>
            </div>

            {/* ---------- Informations ---------- */}
            <div className={styles.drawerSection}>Informations</div>
            <div className={styles.infoList}>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Délai</span>
                <span className={styles.infoValue}>
                  {labelOf(DELAI_LABELS, detail.delai)}
                </span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Nature application</span>
                <span className={styles.infoValue}>
                  {labelOf(NATURE_LABELS, detail.natureApplication)}
                </span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Langue</span>
                <span className={styles.infoValue}>
                  {labelOf(LANGUE_LABELS, detail.langue)}
                </span>
              </div>
              <div className={styles.optRow}>
                <span className={styles.infoLabel}>Date</span>
                <span className={styles.infoValue}>
                  {detail.createdAt ? formatDateFr(detail.createdAt) : "—"}
                </span>
              </div>
            </div>
          </>
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
