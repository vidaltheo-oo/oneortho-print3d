"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  deleteStlFiles,
  formatDateFr,
  markStlDownloaded,
  signedStlUrl,
  type AdminStlFile,
} from "@/lib/admin";
import styles from "./admin.module.css";

// Le rendu three.js n'est charge qu'a l'ouverture du panneau (chunk dedie, pas de SSR).
const StlCanvas = dynamic(() => import("./StlCanvas"), { ssr: false });

function formatVolume(mm3: number | null): string {
  if (mm3 == null || !Number.isFinite(mm3)) return "—";
  return `${Math.round(mm3).toLocaleString("fr-FR")} mm³`;
}

export default function StlFileDetail({
  file,
  onClose,
  onChanged,
}: {
  file: AdminStlFile;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Copie locale : le panneau reste ouvert pendant que la liste se recharge.
  const [telechargeLe, setTelechargeLe] = useState(file.telechargeLe);
  const supprime = !!file.supprimeLe;
  const disponible = !!file.storagePath && !supprime;

  // URL signee (1 h) pour alimenter le viewer 3D des l'ouverture.
  useEffect(() => {
    let cancelled = false;
    if (!file.storagePath || file.supprimeLe) {
      setLoadError(true);
      return;
    }
    setViewUrl(null);
    setLoadError(false);
    signedStlUrl(file.storagePath, { expiresIn: 3600 }).then((url) => {
      if (cancelled) return;
      if (url) setViewUrl(url);
      else setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [file.storagePath, file.supprimeLe]);

  async function telecharger() {
    if (!file.storagePath || supprime) return;
    setDownloading(true);
    // URL signee valable 1 heure, en mode telechargement.
    const url = await signedStlUrl(file.storagePath, {
      expiresIn: 3600,
      download: file.nomFichier,
    });
    setDownloading(false);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = file.nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (!telechargeLe) {
      setTelechargeLe(new Date().toISOString());
      await markStlDownloaded(file.id);
      void onChanged();
    }
  }

  async function supprimer() {
    const msg = telechargeLe
      ? `Supprimer "${file.nomFichier}" de la plateforme ? Cette action est définitive.`
      : `"${file.nomFichier}" n'a pas encore été téléchargé. Le supprimer quand même de la plateforme ? Cette action est définitive.`;
    if (!window.confirm(msg)) return;
    setDeleting(true);
    setDeleteError(null);
    const res = await deleteStlFiles([{ id: file.id, storagePath: file.storagePath }]);
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(res.message ?? "Échec de la suppression.");
      return;
    }
    await onChanged();
    onClose();
  }

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHead}>
          <div style={{ minWidth: 0 }}>
            <div className={styles.drawerTitle}>{file.nomFichier}</div>
            <div className={styles.drawerSub}>Fichier STL</div>
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

        {supprime ? (
          <div className={styles.viewerMsgBox}>
            Fichier supprimé de la plateforme le {formatDateFr(file.supprimeLe!)}.
          </div>
        ) : !file.storagePath ? (
          <div className={styles.viewerMsgBox}>
            Fichier non disponible dans le stockage.
          </div>
        ) : loadError ? (
          <div className={styles.viewerMsgBox}>
            Impossible de générer le lien du fichier STL.
          </div>
        ) : viewUrl ? (
          <StlCanvas url={viewUrl} className={styles.detailViewer} />
        ) : (
          <div className={styles.viewerMsgBox}>Chargement du modèle…</div>
        )}

        <button
          type="button"
          className={styles.downloadBtn}
          onClick={telecharger}
          disabled={!disponible || downloading}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3v10M6 9l4 4 4-4M4 16h12" />
          </svg>
          {downloading ? "Génération du lien…" : "Télécharger"}
        </button>

        {disponible && (
          <button
            type="button"
            className={`${styles.actBtn} ${styles.actBtnRefuse}`}
            style={{ width: "100%", marginTop: 10, padding: 10 }}
            onClick={supprimer}
            disabled={deleting}
          >
            {deleting ? "Suppression…" : "Supprimer de la plateforme"}
          </button>
        )}
        {deleteError && (
          <div className={styles.gateError} style={{ marginTop: 10 }}>
            {deleteError}
          </div>
        )}

        <div className={styles.drawerSection}>Informations</div>
        <div className={styles.infoList}>
          <div>
            <p className={styles.infoLabel}>Nom du fichier</p>
            <p className={styles.infoValue}>{file.nomFichier}</p>
          </div>
          <div>
            <p className={styles.infoLabel}>Volume</p>
            <p className={styles.infoValue}>{formatVolume(file.volumeMm3)}</p>
          </div>
          <div>
            <p className={styles.infoLabel}>Client</p>
            <p className={styles.infoValue}>
              {file.clientRaisonSociale ?? "—"}
            </p>
          </div>
          <div>
            <p className={styles.infoLabel}>Commande liée</p>
            <p className={styles.infoValue}>{file.commandeNumero ?? "—"}</p>
          </div>
          <div>
            <p className={styles.infoLabel}>Stockage</p>
            <p className={styles.infoValue}>
              {supprime
                ? `Supprimé le ${formatDateFr(file.supprimeLe!)}`
                : telechargeLe
                  ? `Sur la plateforme, téléchargé le ${formatDateFr(telechargeLe)}`
                  : "Sur la plateforme, pas encore téléchargé"}
            </p>
          </div>
          <div>
            <p className={styles.infoLabel}>Dépôt</p>
            <p className={styles.infoValue}>
              {file.createdAt ? formatDateFr(file.createdAt) : "—"}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
