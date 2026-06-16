"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ensureClientRecord, type ClientProfile } from "@/lib/clients";
import { firstNameOf } from "@/lib/profile";
import { triggerWelcome } from "@/lib/welcome";
import { PASSWORD_RULES, isPasswordValid } from "@/lib/password";
import { useT } from "@/lib/i18n/provider";
import PasswordInput from "@/components/PasswordInput";
import styles from "@/components/auth.module.css";

const AFTER_AUTH = "/configurateur";

const ACTIVITES = [
  { value: "dispositif_medical", tkey: "activity.md" },
  { value: "prototype", tkey: "activity.proto" },
  { value: "autre", tkey: "activity.other" },
];

// Concatene les champs d'adresse en une seule chaine (la table clients stocke
// chaque adresse dans une unique colonne texte).
function composeAddress(
  rue: string,
  cp: string,
  ville: string,
  pays: string
): string | null {
  const parts = [rue.trim(), `${cp.trim()} ${ville.trim()}`.trim(), pays.trim()];
  const joined = parts.filter(Boolean).join(", ");
  return joined || null;
}

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M2.5 6L5 8.5L9.5 3.5"
      stroke="#fff"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Critere valide (coche verte) / invalide (croix rouge).
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

export default function SignupForm() {
  const router = useRouter();
  const t = useT();

  const [raisonSociale, setRaisonSociale] = useState("");
  const [siret, setSiret] = useState("");
  const [tva, setTva] = useState("");
  const [typeActivite, setTypeActivite] = useState("dispositif_medical");

  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  const [bRue, setBRue] = useState("");
  const [bCp, setBCp] = useState("");
  const [bVille, setBVille] = useState("");
  const [bPays, setBPays] = useState("France");

  const [shipDiff, setShipDiff] = useState(false);
  const [sRue, setSRue] = useState("");
  const [sCp, setSCp] = useState("");
  const [sVille, setSVille] = useState("");
  const [sPays, setSPays] = useState("France");

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!raisonSociale.trim()) {
      setError(t("signup.err.raison"));
      return;
    }
    if (!isPasswordValid(password)) {
      setError(t("signup.err.password"));
      return;
    }
    if (password !== password2) {
      setError(t("signup.err.passwordMatch"));
      return;
    }

    const profile: ClientProfile = {
      raison_sociale: raisonSociale.trim(),
      siret: siret.trim() || null,
      tva_intracom: tva.trim() || null,
      type_activite: typeActivite,
      nom: nom.trim() || null,
      fonction: fonction.trim() || null,
      email: email.trim() || null,
      telephone: telephone.trim() || null,
      adresse_facturation: composeAddress(bRue, bCp, bVille, bPays),
      adresse_livraison: shipDiff
        ? composeAddress(sRue, sCp, sVille, sPays)
        : null,
    };

    setPending(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: profile,
        // Si la confirmation email est active, le lien doit revenir sur l'app
        // (sinon il pointe vers la Site URL Supabase par defaut = lien casse).
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/connexion`
            : undefined,
      },
    });

    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }

    // Session immediate (confirmation email desactivee) : on cree la fiche
    // client tout de suite. Sinon elle sera creee a la premiere connexion.
    if (data.session && data.user) {
      await ensureClientRecord(data.user.id, profile);
      const first = firstNameOf(profile.nom) || profile.raison_sociale || "";
      if (first) triggerWelcome(first);
      router.push(AFTER_AUTH);
      return;
    }

    setPending(false);
    setSuccess(t("signup.success"));
  }

  const pwValid = isPasswordValid(password);

  return (
    <main className={styles.wrapSignup}>
      <h1 className={styles.pageTitle}>{t("signup.title")}</h1>
      <p className={styles.pageSub}>{t("signup.subtitle")}</p>

      <form className={styles.card} onSubmit={onSubmit}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {/* Société */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span className={styles.dot} />
            {t("section.company")}
          </div>
          <div className={styles.grid2}>
            <label className={`${styles.label} ${styles.full}`}>
              {t("field.raison")}
              <input
                className={styles.input}
                required
                placeholder="Clinique Saint-Roch"
                value={raisonSociale}
                onChange={(e) => setRaisonSociale(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              {t("field.siret")}
              <input
                className={styles.input}
                placeholder="123 456 789 00012"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              {t("field.tva")}
              <input
                className={styles.input}
                placeholder="FR 00 123456789"
                value={tva}
                onChange={(e) => setTva(e.target.value)}
              />
            </label>
          </div>

          <div className={styles.subLabel}>{t("field.activity")}</div>
          <div className={styles.pills}>
            {ACTIVITES.map((a) => (
              <button
                key={a.value}
                type="button"
                className={`${styles.pill} ${
                  typeActivite === a.value ? styles.pillActive : ""
                }`}
                onClick={() => setTypeActivite(a.value)}
              >
                {t(a.tkey)}
              </button>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span className={styles.dot} />
            {t("section.contact")}
          </div>
          <div className={styles.grid2}>
            <label className={styles.label}>
              {t("field.contactName")}
              <input
                className={styles.input}
                placeholder="Dr. Camille Mercier"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              {t("field.fonction")}
              <input
                className={styles.input}
                placeholder="Responsable achats"
                value={fonction}
                onChange={(e) => setFonction(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              {t("field.email")}
              <input
                className={styles.input}
                type="email"
                required
                autoComplete="email"
                placeholder="achats@st-roch.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              {t("field.phone")}
              <input
                className={styles.input}
                placeholder="+33 4 26 00 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Adresse de facturation */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span className={styles.dot} />
            {t("section.billing")}
          </div>
          <div className={styles.grid3}>
            <label className={`${styles.label} ${styles.full}`}>
              {t("field.address")}
              <input
                className={styles.input}
                placeholder="12 rue de la Santé"
                value={bRue}
                onChange={(e) => setBRue(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              {t("field.zip")}
              <input
                className={styles.input}
                placeholder="69007"
                value={bCp}
                onChange={(e) => setBCp(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              {t("field.city")}
              <input
                className={styles.input}
                placeholder="Lyon"
                value={bVille}
                onChange={(e) => setBVille(e.target.value)}
              />
            </label>
            <label className={styles.label}>
              {t("field.country")}
              <input
                className={styles.input}
                placeholder="France"
                value={bPays}
                onChange={(e) => setBPays(e.target.value)}
              />
            </label>
          </div>

          <label className={styles.checkRow}>
            <span
              className={`${styles.checkBox} ${shipDiff ? styles.checkBoxOn : ""}`}
              onClick={(e) => {
                e.preventDefault();
                setShipDiff((v) => !v);
              }}
              role="checkbox"
              aria-checked={shipDiff}
            >
              {shipDiff && <Check />}
            </span>
            {t("signup.shipDiff")}
          </label>
        </div>

        {/* Adresse de livraison (conditionnel) */}
        {shipDiff && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <span className={styles.dot} />
              {t("section.shipping")}
            </div>
            <div className={styles.grid3}>
              <label className={`${styles.label} ${styles.full}`}>
                {t("field.address")}
                <input
                  className={styles.input}
                  placeholder="Quai de livraison — Bât. C"
                  value={sRue}
                  onChange={(e) => setSRue(e.target.value)}
                />
              </label>
              <label className={styles.label}>
                {t("field.zip")}
                <input
                  className={styles.input}
                  placeholder="69007"
                  value={sCp}
                  onChange={(e) => setSCp(e.target.value)}
                />
              </label>
              <label className={styles.label}>
                {t("field.city")}
                <input
                  className={styles.input}
                  placeholder="Lyon"
                  value={sVille}
                  onChange={(e) => setSVille(e.target.value)}
                />
              </label>
              <label className={styles.label}>
                {t("field.country")}
                <input
                  className={styles.input}
                  placeholder="France"
                  value={sPays}
                  onChange={(e) => setSPays(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {/* Mot de passe */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span className={styles.dot} />
            {t("section.password")}
          </div>
          <div className={styles.grid2}>
            <label className={styles.label}>
              {t("field.password")}
              <PasswordInput
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={setPassword}
              />
            </label>
            <label className={styles.label}>
              {t("field.confirm")}
              <PasswordInput
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={password2}
                onChange={setPassword2}
              />
            </label>
          </div>

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
        </div>

        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={pending || !pwValid}
        >
          {pending ? t("signup.submitting") : t("signup.submit")}
        </button>
        <p className={styles.switch}>
          {t("signup.switchText")}{" "}
          <Link href="/connexion" className={styles.switchLink}>
            {t("signup.switchLink")}
          </Link>
        </p>
      </form>
    </main>
  );
}
