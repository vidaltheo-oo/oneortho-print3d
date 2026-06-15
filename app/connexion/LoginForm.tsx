"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ensureClientRecord, type ClientProfile } from "@/lib/clients";
import styles from "@/components/auth.module.css";

// Destination apres connexion. L'espace client (/mes-commandes) n'est pas encore
// integre : on renvoie pour l'instant vers le configurateur.
const AFTER_AUTH = "/configurateur";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    if (data.user) {
      await ensureClientRecord(
        data.user.id,
        data.user.user_metadata as ClientProfile
      );
    }

    router.push(AFTER_AUTH);
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
          <input
            className={styles.input}
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <div className={styles.forgot}>
          <button type="button" className={styles.forgotLink}>
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
