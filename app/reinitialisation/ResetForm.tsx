"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import { useT } from "@/lib/i18n/provider";
import PasswordInput from "@/components/PasswordInput";
import styles from "@/components/auth.module.css";

// Phase du parcours de récupération :
// checking  — le lien est en cours de validation par supabase-js (detectSessionInUrl)
// ready     — session de récupération active, l'utilisateur peut saisir un mot de passe
// invalid   — pas de session après délai : lien expiré, déjà utilisé ou URL directe
// done      — mot de passe mis à jour
type Phase = "checking" | "ready" | "invalid" | "done";

const RuleCheck = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="7" fill="#004B32" />
    <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const RuleCross = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="7" fill="#d1ccbf" />
    <path d="M4.8 4.8l4.4 4.4M9.2 4.8l-4.4 4.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export default function ResetForm() {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Le lien de récupération place les tokens dans le fragment d'URL ;
    // supabase-js les consomme de manière asynchrone au chargement. On écoute
    // l'événement PASSWORD_RECOVERY et, en secours, la présence d'une session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session) setPhase("ready");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) setPhase("ready");
    });

    const timer = setTimeout(() => {
      if (!cancelled) {
        setPhase((p) => (p === "checking" ? "invalid" : p));
      }
    }, 5000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPasswordValid(password)) {
      setError(t("signup.err.password"));
      return;
    }
    if (password !== confirm) {
      setError(t("signup.err.passwordMatch"));
      return;
    }
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(t("reset.error"));
      return;
    }
    setPhase("done");
  }

  return (
    <main className={styles.wrapLogin}>
      <form className={styles.cardLogin} onSubmit={onSubmit}>
        <div className={styles.loginTitle}>{t("reset.title")}</div>
        <p className={styles.loginSub}>{t("reset.subtitle")}</p>

        {phase === "checking" && <p className={styles.loginSub}>{t("reset.checking")}</p>}

        {phase === "invalid" && (
          <>
            <div className={styles.error} style={{ marginBottom: 14 }}>
              {t("reset.invalidLink")}
            </div>
            <p className={styles.switch}>
              <Link href="/connexion" className={styles.switchLink}>
                {t("reset.backToLogin")}
              </Link>
            </p>
          </>
        )}

        {phase === "done" && (
          <>
            <div className={styles.success} style={{ marginBottom: 14 }}>
              {t("reset.success")}
            </div>
            <p className={styles.switch}>
              <Link href="/connexion" className={styles.switchLink}>
                {t("reset.backToLogin")}
              </Link>
            </p>
          </>
        )}

        {phase === "ready" && (
          <>
            {error && (
              <div className={styles.error} style={{ marginBottom: 14 }}>
                {error}
              </div>
            )}

            <label className={`${styles.label} ${styles.mb6}`}>
              {t("reset.newPassword")}
              <PasswordInput
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={setPassword}
              />
            </label>

            <ul className={styles.pwRules}>
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li
                    key={rule.key}
                    className={`${styles.pwRule} ${ok ? styles.pwRuleOk : ""}`}
                  >
                    <span className={styles.pwRuleIcon}>
                      {ok ? <RuleCheck /> : <RuleCross />}
                    </span>
                    {t(`pwrule.${rule.key}`)}
                  </li>
                );
              })}
            </ul>

            <label className={`${styles.label} ${styles.mb14}`}>
              {t("field.confirm")}
              <PasswordInput
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={confirm}
                onChange={setConfirm}
              />
            </label>

            <button type="submit" className={styles.primaryBtn} disabled={pending}>
              {pending ? t("reset.submitting") : t("reset.submit")}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
