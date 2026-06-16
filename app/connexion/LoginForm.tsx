"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ensureClientRecord, type ClientProfile } from "@/lib/clients";
import { checkIsAdmin } from "@/lib/admin";
import { firstNameOf } from "@/lib/profile";
import { triggerWelcome } from "@/lib/welcome";
import PasswordInput from "@/components/PasswordInput";
import styles from "@/components/auth.module.css";

// Destination apres connexion. L'espace client (/mes-commandes) n'est pas encore
// integre : on renvoie pour l'instant vers le configurateur.
const AFTER_AUTH = "/configurateur";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onForgotPassword() {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError("Saisissez votre email ci-dessus puis cliquez à nouveau.");
      return;
    }
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/connexion`
          : undefined,
    });
    // Message neutre (ne revele pas si le compte existe).
    setInfo(
      "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé."
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect.");
      setPending(false);
      return;
    }

    // Reconcilie la fiche client si elle n'a pas pu etre creee a l'inscription
    // (cas confirmation email). Le profil est lu depuis user_metadata.
    const meta = data.user?.user_metadata as ClientProfile | undefined;
    if (data.user) {
      await ensureClientRecord(data.user.id, meta);
    }

    // Les administrateurs sont rediriges vers le back-office. On passe l'id issu
    // de la connexion (pas de getUser() supplementaire qui pourrait echouer).
    const admin = await checkIsAdmin(data.user?.id);

    // Message d'accueil client uniquement (pas sur le back-office admin).
    if (!admin) {
      const first = firstNameOf(meta?.nom) || meta?.raison_sociale || "";
      if (first) triggerWelcome(first);
    }

    router.push(admin ? "/admin" : AFTER_AUTH);
  }

  return (
    <main className={styles.wrapLogin}>
      <form className={styles.cardLogin} onSubmit={onSubmit}>
        <div className={styles.loginTitle}>Connexion</div>
        <p className={styles.loginSub}>Accédez à votre espace client ONE PRINT</p>

        {error && (
          <div className={styles.error} style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}
        {info && (
          <div className={styles.success} style={{ marginBottom: 14 }}>
            {info}
          </div>
        )}

        <label className={`${styles.label} ${styles.mb14}`}>
          Email
          <input
            className={styles.input}
            type="email"
            required
            autoComplete="email"
            placeholder="vous@societe.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className={`${styles.label} ${styles.mb6}`}>
          Mot de passe
          <PasswordInput
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={setPassword}
          />
        </label>

        <div className={styles.forgot}>
          <button
            type="button"
            className={styles.forgotLink}
            onClick={onForgotPassword}
          >
            Mot de passe oublié ?
          </button>
        </div>

        <button type="submit" className={styles.primaryBtn} disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>

        <p className={styles.switch}>
          Nouveau client ?{" "}
          <Link href="/inscription" className={styles.switchLink}>
            Créer un compte
          </Link>
        </p>
      </form>
    </main>
  );
}
