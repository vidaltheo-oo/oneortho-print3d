"use client";

import { useEffect, useState } from "react";
import { WELCOME_KEY, WELCOME_EVENT } from "@/lib/welcome";
import styles from "./WelcomeToast.module.css";

// Toast d'accueil affiche ~3,5 s apres une connexion reussie. Monte une seule
// fois dans le layout racine ; ecoute l'evenement (navigation client) et lit la
// sessionStorage au montage (chargement complet de page).
export default function WelcomeToast() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const show = (first: string) => {
      if (!first) return;
      setName(first);
      try {
        window.sessionStorage.removeItem(WELCOME_KEY);
      } catch {
        /* sans effet */
      }
      clearTimeout(timer);
      timer = setTimeout(() => setName(null), 3500);
    };

    try {
      const stored = window.sessionStorage.getItem(WELCOME_KEY);
      if (stored) show(stored);
    } catch {
      /* sans effet */
    }

    const onEvt = (e: Event) => show((e as CustomEvent<string>).detail);
    window.addEventListener(WELCOME_EVENT, onEvt);
    return () => {
      window.removeEventListener(WELCOME_EVENT, onEvt);
      clearTimeout(timer);
    };
  }, []);

  if (!name) return null;
  return (
    <div className={styles.toast} role="status" aria-live="polite">
      Bonjour {name} !
    </div>
  );
}
