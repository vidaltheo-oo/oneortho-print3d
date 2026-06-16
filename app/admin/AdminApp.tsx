"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  checkIsAdmin,
  fetchAdminData,
  fetchAdminClients,
  fetchAdminStl,
  updateDevisStatut,
  updateCommandeStatut,
  type AdminData,
  type AdminClient,
  type AdminStlFile,
  type DevisStatut,
  type CommandeStatut,
} from "@/lib/admin";
import { notifyOrderStatus } from "@/lib/notifications";
import styles from "./admin.module.css";
import AdminDashboard from "./AdminDashboard";
import AdminDevis from "./AdminDevis";
import AdminCommandes from "./AdminCommandes";
import AdminClients from "./AdminClients";
import AdminStl from "./AdminStl";
import { EyeOpen, EyeOff } from "@/components/PasswordInput";

type Phase = "checking" | "login" | "denied" | "ready";
type View = "dashboard" | "devis" | "commandes" | "clients" | "stl";

const NAV: { key: View; label: string; enabled: boolean }[] = [
  { key: "dashboard", label: "Bord", enabled: true },
  { key: "devis", label: "Devis", enabled: true },
  { key: "commandes", label: "Commandes", enabled: true },
  { key: "clients", label: "Clients", enabled: true },
  { key: "stl", label: "STL", enabled: true },
];

const TITLES: Record<View, string> = {
  dashboard: "tableau de bord",
  devis: "devis",
  commandes: "commandes",
  clients: "clients",
  stl: "fichiers STL",
};

function NavIcon({ k }: { k: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (k) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "devis":
      return (
        <svg {...common}>
          <path d="M6 2h9l5 5v15H6z" />
          <path d="M14 2v6h6M9 13h7M9 17h7" />
        </svg>
      );
    case "commandes":
      return (
        <svg {...common}>
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="17" cy="20" r="1.4" />
          <path d="M2 3h2.2l2.1 12.2a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.57-1.27L21 7H5.2" />
        </svg>
      );
    case "clients":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.6M15 20a6 6 0 0 1 6-2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 2 21 7v10l-9 5-9-5V7z" />
          <path d="M12 12 21 7M12 12v10M12 12 3 7" />
        </svg>
      );
  }
}

export default function AdminApp() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [view, setView] = useState<View>("dashboard");
  const [data, setData] = useState<AdminData>({ devis: [], commandes: [] });
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [stlFiles, setStlFiles] = useState<AdminStlFile[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);

  async function loadAfterAuth() {
    const { data: userData } = await supabase.auth.getUser();
    const admin = await checkIsAdmin(userData.user?.id);
    if (!admin) {
      setPhase("denied");
      return;
    }
    const meta = userData.user?.user_metadata as
      | { raison_sociale?: string }
      | undefined;
    setAdminName(meta?.raison_sociale ?? userData.user?.email ?? "Admin");

    const [result, clientsRes, stlRes] = await Promise.all([
      fetchAdminData(),
      fetchAdminClients(),
      fetchAdminStl(),
    ]);
    if (!result.ok) {
      setDataError(result.message ?? "Erreur de chargement");
      setPhase("ready");
      return;
    }
    setData(result.data);
    if (clientsRes.ok) setClients(clientsRes.clients);
    if (stlRes.ok) setStlFiles(stlRes.files);
    setPhase("ready");
  }

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setPhase("login");
        return;
      }
      await loadAfterAuth();
    };
    init();
  }, []);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginPending(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoginPending(false);
    if (error) {
      setLoginError("Email ou mot de passe incorrect.");
      return;
    }
    setPhase("checking");
    await loadAfterAuth();
  }

  async function logout() {
    await supabase.auth.signOut();
    setPhase("login");
  }

  // Recharge devis + commandes depuis la base. On ne se fie pas a un etat local
  // optimiste : il divergerait du statut reel (et entre admins) et laisserait la
  // vue Devis afficher un ancien statut de commande liee.
  async function reloadData() {
    const result = await fetchAdminData();
    if (result.ok) setData(result.data);
  }

  async function onUpdateDevis(id: string, statut: DevisStatut) {
    const ok = await updateDevisStatut(id, statut);
    if (ok) await reloadData();
  }

  async function onUpdateCommande(id: string, statut: CommandeStatut) {
    const ok = await updateCommandeStatut(id, statut);
    if (ok) {
      // Email client pour les statuts notifiables (en_production/expediee/livree).
      void notifyOrderStatus(id, statut);
      // Relit la base : la vue Devis (statut derive de la commande) reste alignee.
      await reloadData();
    }
  }

  // Rafraichit au retour sur l'onglet : un autre admin a pu changer des statuts.
  useEffect(() => {
    if (phase !== "ready") return;
    const onFocus = () => {
      void reloadData();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // reloadData est stable (n'utilise que setData) ; pas de dependance requise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "checking") {
    return <div className={styles.loading}>Chargement de l&apos;espace admin…</div>;
  }

  if (phase === "login") {
    return (
      <div className={styles.gate}>
        <form className={styles.gateBox} onSubmit={onLogin}>
          <div className={styles.gateLogo}>
            ONE <span className={styles.accent}>PRINT</span>
          </div>
          <div className={styles.gateTitle}>Espace administrateur</div>
          <p className={styles.gateSub}>Back-office ONE PRINT</p>

          {loginError && <div className={styles.gateError}>{loginError}</div>}

          <label className={styles.gateField}>
            Email
            <input
              className={styles.gateInput}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className={styles.gateField}>
            Mot de passe
            <div className={styles.gatePwWrap}>
              <input
                className={styles.gateInput}
                style={{ marginTop: 0, paddingRight: 44 }}
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.gatePwToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                title={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <EyeOff /> : <EyeOpen />}
              </button>
            </div>
          </label>
          <button type="submit" className={styles.gateBtn} disabled={loginPending}>
            {loginPending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className={styles.gate}>
        <div className={styles.gateBox}>
          <div className={styles.gateLogo}>
            ONE <span className={styles.accent}>PRINT</span>
          </div>
          <div className={styles.gateTitle}>Accès réservé</div>
          <p className={styles.gateSub}>
            Votre compte n&apos;a pas les droits administrateur.
          </p>
          <button type="button" className={styles.gateBtn} onClick={logout}>
            Changer de compte
          </button>
          <p className={styles.gateInfo}>
            Un administrateur doit ajouter votre identifiant à la table
            <code> admins </code> pour accéder au back-office.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          ONE<br />
          <span className={styles.accent}>PRINT</span>
        </div>
        {NAV.map((n) => {
          const active = n.enabled && n.key === view;
          return (
            <button
              key={n.key}
              type="button"
              className={`${styles.navBtn} ${active ? styles.navBtnActive : ""} ${
                n.enabled ? "" : styles.navBtnDisabled
              }`}
              onClick={() => n.enabled && setView(n.key as View)}
              disabled={!n.enabled}
              title={n.enabled ? n.label : `${n.label} — bientôt`}
            >
              <NavIcon k={n.key} />
              {n.label}
            </button>
          );
        })}
        <div className={styles.sideProfile}>
          <div className={styles.sideAvatar}>
            {adminName.slice(0, 2).toUpperCase()}
          </div>
          <div className={styles.sideName}>{adminName}</div>
          <div className={styles.sideRole}>Admin</div>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>{TITLES[view]}</h1>
          {/* Recherche disponible directement dans les vues Devis/Clients/STL. */}
          <button
            type="button"
            className={styles.headerAvatar}
            onClick={logout}
            title="Se déconnecter"
            style={{ marginLeft: "auto" }}
          >
            {adminName.slice(0, 2).toUpperCase()}
          </button>
        </header>

        <main className={styles.main}>
          {dataError && (
            <div className={styles.gateError} style={{ marginBottom: 16 }}>
              {dataError}
            </div>
          )}
          {view === "dashboard" && (
            <AdminDashboard devis={data.devis} onSeeDevis={() => setView("devis")} />
          )}
          {view === "devis" && (
            <AdminDevis devis={data.devis} onUpdate={onUpdateDevis} />
          )}
          {view === "commandes" && (
            <AdminCommandes commandes={data.commandes} onUpdate={onUpdateCommande} />
          )}
          {view === "clients" && <AdminClients clients={clients} />}
          {view === "stl" && <AdminStl files={stlFiles} />}
        </main>
      </div>
    </div>
  );
}
