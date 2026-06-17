"use client";

import styles from "./admin.module.css";

// Pastille de lecture rapide : verte "Oui", grise "Non".
export default function OuiNon({ value }: { value: boolean }) {
  return (
    <span className={`${styles.pill2} ${value ? styles.pillYes : styles.pillNo}`}>
      {value ? "Oui" : "Non"}
    </span>
  );
}
