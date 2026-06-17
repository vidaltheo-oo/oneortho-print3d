"use client";

import StlCanvas from "./StlCanvas";
import styles from "./admin.module.css";

// Viewer 3D STL en modale plein ecran (back-office). Le rendu three.js vit dans
// StlCanvas (partage avec le panneau de detail).
export default function StlViewer({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.viewerOverlay} onClick={onClose}>
      <div className={styles.viewerBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.viewerHead}>
          <span className={styles.viewerTitle}>{title}</span>
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
        <StlCanvas url={url} />
      </div>
    </div>
  );
}
