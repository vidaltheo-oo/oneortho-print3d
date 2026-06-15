"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { loadCart, cartPieceCount, CART_CHANGED_EVENT } from "@/lib/cart";
import styles from "./EspaceHeader.module.css";

// Langues prevues par la maquette. Selecteur visuel uniquement pour l'instant ;
// l'i18n complet (6 langues) sera branche dans un point ulterieur.
const LANGS = ["FR", "EN", "ES", "IT", "DE", "PT"];

function initials(name: string | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "??";
}

export default function EspaceHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const refreshCart = () => setCartCount(cartPieceCount(loadCart()));
    refreshCart();
    window.addEventListener("storage", refreshCart);
    window.addEventListener(CART_CHANGED_EVENT, refreshCart);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", refreshCart);
      window.removeEventListener(CART_CHANGED_EVENT, refreshCart);
    };
  }, []);

  const isConfig = pathname?.startsWith("/configurateur");
  const clientName =
    (user?.user_metadata?.raison_sociale as string | undefined) ?? user?.email;

  async function logout() {
    await supabase.auth.signOut();
    router.push("/configurateur");
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/configurateur" className={styles.brand}>
          <div className={styles.brandTitle}>
            ONE <span className={styles.accent}>PRINT</span>
          </div>
          <div className={styles.brandSub}>Espace client — OneOrtho Medical</div>
        </Link>
        <nav className={styles.nav}>
          <Link
            href="/configurateur"
            className={`${styles.navLink} ${isConfig ? styles.navLinkActive : ""}`}
          >
            Configurateur
          </Link>
          <Link
            href={user ? "/mes-commandes" : "/connexion"}
            className={`${styles.navLink} ${
              pathname?.startsWith("/mes-commandes") ? styles.navLinkActive : ""
            }`}
          >
            Mon espace
          </Link>
        </nav>
      </div>

      <div className={styles.right}>
        <div className={styles.langs} aria-label="Langue (FR uniquement pour l'instant)">
          {LANGS.map((code) => (
            <span
              key={code}
              className={`${styles.langPill} ${
                code === "FR" ? styles.langPillActive : ""
              }`}
            >
              {code}
            </span>
          ))}
        </div>

        <Link href="/panier" title="Panier" className={styles.cart}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
            <path d="M2 3h2.2l2.1 12.2a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.57-1.27L21 7H5.2" />
          </svg>
          {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
        </Link>

        {user ? (
          <button type="button" className={styles.btnLogin} onClick={logout}>
            {initials(clientName)} · Déconnexion
          </button>
        ) : (
          <div className={styles.authButtons}>
            <Link href="/connexion" className={styles.btnLogin}>
              Se connecter
            </Link>
            <Link href="/inscription" className={styles.btnSignup}>
              S&apos;inscrire
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
