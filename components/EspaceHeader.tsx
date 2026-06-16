"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { loadCart, cartPieceCount, CART_CHANGED_EVENT } from "@/lib/cart";
import { initialsOf } from "@/lib/profile";
import { useI18n } from "@/lib/i18n/provider";
import { LANGS, LANG_LABELS } from "@/lib/i18n/messages";
import styles from "./EspaceHeader.module.css";

// Icone personne neutre (pastille non connectee).
const PersonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
  </svg>
);

export default function EspaceHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

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

  // Fermeture du dropdown au clic exterieur / touche Echap.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isConfig = pathname?.startsWith("/configurateur");
  const contactName = user?.user_metadata?.nom as string | undefined;
  const raisonSociale = user?.user_metadata?.raison_sociale as
    | string
    | undefined;
  // Nom complet pour le tooltip : contact, sinon raison sociale, sinon email.
  const fullName = contactName || raisonSociale || user?.email || "";

  async function logout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/configurateur");
  }

  function go(path: string) {
    setMenuOpen(false);
    router.push(path);
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/configurateur" className={styles.brand}>
          <div className={styles.brandTitle}>
            ONE <span className={styles.accent}>PRINT</span>
          </div>
          <div className={styles.brandSub}>{t("header.brandSub")}</div>
        </Link>
        <nav className={styles.nav}>
          <Link
            href="/configurateur"
            className={`${styles.navLink} ${isConfig ? styles.navLinkActive : ""}`}
          >
            {t("header.nav.configurator")}
          </Link>
          <Link
            href={user ? "/mes-commandes" : "/connexion"}
            className={`${styles.navLink} ${
              pathname?.startsWith("/mes-commandes") ? styles.navLinkActive : ""
            }`}
          >
            {t("header.nav.space")}
          </Link>
        </nav>
      </div>

      <div className={styles.right}>
        <div className={styles.langs} aria-label={t("header.langLabel")}>
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              className={`${styles.langPill} ${
                code === lang ? styles.langPillActive : ""
              }`}
              onClick={() => setLang(code)}
              aria-pressed={code === lang}
            >
              {LANG_LABELS[code]}
            </button>
          ))}
        </div>

        <Link href="/panier" title={t("header.cart")} className={styles.cart}>
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

        <div className={styles.avatarWrap} ref={avatarRef}>
          <button
            type="button"
            className={`${styles.avatar} ${user ? "" : styles.avatarGuest}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={user ? fullName : t("header.account")}
          >
            {user ? initialsOf(fullName) : <PersonIcon />}
          </button>

          {user && fullName && !menuOpen && (
            <span className={styles.tooltip} role="tooltip">
              {fullName}
            </span>
          )}

          {menuOpen && (
            <div className={styles.menu} role="menu">
              {user ? (
                <>
                  <div className={styles.menuHead}>{fullName}</div>
                  <button
                    type="button"
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => go("/mon-compte")}
                  >
                    {t("menu.account")}
                  </button>
                  <button
                    type="button"
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => go("/mes-commandes")}
                  >
                    {t("menu.orders")}
                  </button>
                  <div className={styles.menuDivider} />
                  <button
                    type="button"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    role="menuitem"
                    onClick={logout}
                  >
                    {t("logout")}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => go("/connexion")}
                  >
                    {t("menu.login")}
                  </button>
                  <button
                    type="button"
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => go("/inscription")}
                  >
                    {t("menu.signup")}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
