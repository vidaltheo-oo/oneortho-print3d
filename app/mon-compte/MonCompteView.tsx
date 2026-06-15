"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchClient,
  saveClient,
  type ClientProfile,
} from "@/lib/clients";
import f from "@/components/auth.module.css";
import styles from "./moncompte.module.css";

type Feedback = { kind: "ok" | "err"; text: string };

export default function MonCompteView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [clientId, setClientId] = useState<string | null>(null);
  const [typeActivite, setTypeActivite] = useState<string | null>(null);

  const [raisonSociale, setRaisonSociale] = useState("");
  const [siret, setSiret] = useState("");
  const [tva, setTva] = useState("");
  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresseFacturation, setAdresseFacturation] = useState("");
  const [adresseLivraison, setAdresseLivraison] = useState("");

  useEffect(() => {
    const init = async () => {
      const result = await fetchClient();
      if (!result.ok) {
        if (result.reason === "auth") {
          router.replace("/connexion");
          return;
        }
        setDbError(true);
        setLoading(false);
        return;
      }
      const src: Partial<ClientProfile> & { id?: string } =
        result.client ?? result.metadata ?? {};
      setClientId(result.client?.id ?? null);
      setTypeActivite(result.client?.type_activite ?? src.type_activite ?? null);
      setRaisonSociale(src.raison_sociale ?? "");
      setSiret(src.siret ?? "");
      setTva(src.tva_intracom ?? "");
      setNom(src.nom ?? "");
      setFonction(src.fonction ?? "");
      setEmail(src.email ?? result.authEmail ?? "");
      setTelephone(src.telephone ?? "");
      setAdresseFacturation(src.adresse_facturation ?? "");
      setAdresseLivraison(src.adresse_livraison ?? "");
      setLoading(false);
    };
    init();
  }, [router]);

  async function onSave() {
    setFeedback(null);
    if (!raisonSociale.trim()) {
      setFeedback({ kind: "err", text: "La raison sociale est obligatoire." });
      return;
    }
    setSaving(true);
    const profile: ClientProfile = {
      raison_sociale: raisonSociale.trim(),
      siret: siret.trim() || null,
      tva_intracom: tva.trim() || null,
      type_activite: typeActivite,
      nom: nom.trim() || null,
      fonction: fonction.trim() || null,
      email: email.trim() || null,
      telephone: telephone.trim() || null,
      adresse_facturation: adresseFacturation.trim() || null,
      adresse_livraison: adresseLivraison.trim() || null,
    };
    const result = await saveClient(clientId, profile);
    setSaving(false);

    if (result.ok) {
      setClientId(result.id);
      setFeedback({ kind: "ok", text: "Fiche enregistrée." });
      return;
    }
    if (result.reason === "auth") {
      router.replace("/connexion");
      return;
    }
    setFeedback({
      kind: "err",
      text: "Échec de l'enregistrement. Réessayez.",
    });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/configurateur");
  }

  if (loading) {
    return (
      <main className={styles.wrap}>
        <h1 className={styles.title}>Mon espace</h1>
        <p className={styles.loading}>Chargement de votre fiche…</p>
      </main>
    );
  }

  if (dbError) {
    return (
      <main className={styles.wrap}>
        <h1 className={styles.title}>Mon espace</h1>
        <p className={styles.loading}>
          Impossible de charger votre fiche pour le moment.
        </p>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>Mon espace</h1>
      {raisonSociale && <p className={styles.sub}>{raisonSociale}</p>}

      <div className={styles.tabs}>
        <button
          type="button"
          className={styles.tab}
          onClick={() => router.push("/mes-commandes")}
        >
          Mes commandes
        </button>
        <button type="button" className={`${styles.tab} ${styles.tabActive}`}>
          Ma fiche
        </button>
      </div>

      <div className={styles.infoBox}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          stroke="#004B32"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="10" cy="10" r="8" />
          <path d="M10 9v4M10 6.5v.5" />
        </svg>
        Ces informations constituent votre fiche client et sont transmises à notre
        équipe ONE PRINT.
      </div>

      <div className={f.card}>
        <div className={f.section}>
          <div className={f.sectionTitle}>
            <span className={f.dot} />
            Société
          </div>
          <div className={f.grid2}>
            <label className={`${f.label} ${f.full}`}>
              Raison sociale
              <input
                className={f.input}
                value={raisonSociale}
                onChange={(e) => setRaisonSociale(e.target.value)}
              />
            </label>
            <label className={f.label}>
              SIRET / N° client
              <input
                className={f.input}
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
              />
            </label>
            <label className={f.label}>
              N° TVA intracom.
              <input
                className={f.input}
                value={tva}
                onChange={(e) => setTva(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className={f.section}>
          <div className={f.sectionTitle}>
            <span className={f.dot} />
            Contact
          </div>
          <div className={f.grid2}>
            <label className={f.label}>
              Nom du contact
              <input
                className={f.input}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </label>
            <label className={f.label}>
              Fonction
              <input
                className={f.input}
                value={fonction}
                onChange={(e) => setFonction(e.target.value)}
              />
            </label>
            <label className={f.label}>
              Email
              <input
                className={f.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className={f.label}>
              Téléphone
              <input
                className={f.input}
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className={f.section}>
          <div className={f.sectionTitle}>
            <span className={f.dot} />
            Adresses
          </div>
          <div className={f.grid2}>
            <label className={`${f.label} ${f.full}`}>
              Adresse de facturation
              <input
                className={f.input}
                placeholder="12 rue de la Santé, 69007 Lyon, France"
                value={adresseFacturation}
                onChange={(e) => setAdresseFacturation(e.target.value)}
              />
            </label>
            <label className={`${f.label} ${f.full}`}>
              Adresse de livraison (si différente)
              <input
                className={f.input}
                placeholder="Laisser vide si identique à la facturation"
                value={adresseLivraison}
                onChange={(e) => setAdresseLivraison(e.target.value)}
              />
            </label>
          </div>
        </div>

        {feedback && (
          <div
            className={`${styles.feedback} ${
              feedback.kind === "ok" ? styles.feedbackOk : styles.feedbackErr
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
          <button type="button" className={styles.logoutBtn} onClick={logout}>
            Se déconnecter
          </button>
        </div>
      </div>
    </main>
  );
}
