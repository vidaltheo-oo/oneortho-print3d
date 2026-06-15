"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  loadCart,
  saveCart,
  cartPieceCount,
  labelOf,
  formatEUR,
  NATURE_LABELS,
  FINITION_LABELS,
  COULEUR_LABELS,
  DELAI_LABELS,
  CART_CHANGED_EVENT,
  type CartEntry,
} from "@/lib/cart";
import { submitCart } from "@/lib/checkout";
import { notifyOrderCreated } from "@/lib/notifications";
import styles from "./panier.module.css";

const PieceIcon = () => (
  <svg width="26" height="26" viewBox="0 0 120 120" fill="none">
    <polygon
      points="60,12 104,36 60,60 16,36"
      fill="#AAE66E"
      fillOpacity=".55"
      stroke="#004B32"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <polygon
      points="16,36 60,60 60,108 16,84"
      fill="#004B32"
      fillOpacity=".16"
      stroke="#004B32"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <polygon
      points="104,36 60,60 60,108 104,84"
      fill="#004B32"
      fillOpacity=".10"
      stroke="#004B32"
      strokeWidth="3"
      strokeLinejoin="round"
    />
  </svg>
);

type Feedback = { kind: "ok" | "err"; text: string };

export default function CartView() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    // Lecture client-only du panier (localStorage indisponible au SSR) puis
    // abonnement aux changements (autre onglet ou meme onglet via event custom).
    const refresh = () => setCart(loadCart());
    const init = () => {
      refresh();
      setMounted(true);
    };
    init();
    window.addEventListener("storage", refresh);
    window.addEventListener(CART_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CART_CHANGED_EVENT, refresh);
    };
  }, []);

  function removeEntry(id: string) {
    const next = cart.filter((e) => e.id !== id);
    saveCart(next);
    setCart(next);
    setFeedback(null);
  }

  async function onCheckout() {
    setFeedback(null);
    setPending(true);
    const result = await submitCart(cart);
    setPending(false);

    if (result.ok) {
      // Emails (confirmation client + notification interne), best-effort.
      void notifyOrderCreated(result.commandeIds);
      saveCart([]);
      setCart([]);
      setFeedback({
        kind: "ok",
        text: `Demande envoyée (${result.count} devis). Un email de confirmation vous a été adressé. Notre équipe vous recontacte sous 24 h.`,
      });
      return;
    }

    switch (result.reason) {
      case "auth":
        router.push("/connexion");
        break;
      case "no_client":
        setFeedback({
          kind: "err",
          text: "Complétez votre fiche client avant de demander la production.",
        });
        break;
      case "empty":
        setFeedback({ kind: "err", text: "Votre panier est vide." });
        break;
      default:
        setFeedback({
          kind: "err",
          text: "Échec de l'envoi. Réessayez ou contactez-nous.",
        });
    }
  }

  if (!mounted) return <main className={styles.wrap} />;

  const pieceCount = cartPieceCount(cart);
  const subHt = cart.reduce((s, e) => s + (e.montant_ht || 0), 0);
  const tva = cart.reduce((s, e) => s + (e.tva || 0), 0);
  const ttc = cart.reduce((s, e) => s + (e.montant_ttc || 0), 0);
  const remise = cart.reduce((s, e) => s + (e.remise || 0), 0);

  if (cart.length === 0) {
    return (
      <main className={styles.wrap}>
        <h1 className={styles.title}>Mon panier</h1>
        {feedback && (
          <div
            className={`${styles.feedback} ${
              feedback.kind === "ok" ? styles.feedbackOk : styles.feedbackErr
            }`}
          >
            {feedback.text}
          </div>
        )}
        <div className={styles.empty} style={{ marginTop: feedback ? 16 : 0 }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E2DED2"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: "0 auto" }}
          >
            <circle cx="9" cy="20" r="1.4" />
            <circle cx="17" cy="20" r="1.4" />
            <path d="M2 3h2.2l2.1 12.2a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.57-1.27L21 7H5.2" />
          </svg>
          <p className={styles.emptyText}>Votre panier est vide.</p>
          <Link href="/configurateur" className={styles.emptyCta}>
            Configurer une pièce
          </Link>
        </div>
      </main>
    );
  }

  const cfgCount = cart.length;
  const s1 = cfgCount > 1 ? "s" : "";
  const s2 = pieceCount > 1 ? "s" : "";

  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>Mon panier</h1>
      <p className={styles.sub}>
        {cfgCount} configuration{s1} · {pieceCount} pièce{s2}
      </p>

      <div className={styles.layout}>
        <div className={styles.list}>
          {cart.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryHead}>
                <span className={styles.badge}>
                  {labelOf(NATURE_LABELS, entry.nature_application)}
                </span>
                <span className={styles.numero}>{entry.numero}</span>
                <span className={styles.delai}>
                  {labelOf(DELAI_LABELS, entry.delai)}
                </span>
                <span className={styles.entryTotal}>
                  {formatEUR(entry.montant_ttc)}
                </span>
                <button
                  type="button"
                  className={styles.remove}
                  title="Retirer"
                  onClick={() => removeEntry(entry.id)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l8 8M14 6l-8 8" />
                  </svg>
                </button>
              </div>

              {entry.pieces.map((p, i) => (
                <div key={i} className={styles.piece}>
                  <span className={styles.thumb}>
                    <PieceIcon />
                  </span>
                  <div className={styles.pieceInfo}>
                    <div className={styles.pieceName}>{p.nom_fichier}</div>
                    <div className={styles.pieceOpts}>
                      PA2200 · {labelOf(COULEUR_LABELS, p.couleur)} ·{" "}
                      {labelOf(FINITION_LABELS, p.finition)} ·{" "}
                      {Math.round(p.volume_mm3).toLocaleString("fr-FR")} mm³
                    </div>
                  </div>
                  <span className={styles.pieceQty}>× {p.quantite}</span>
                  <span className={styles.piecePrice}>{formatEUR(p.prix_ht)}</span>
                </div>
              ))}
            </div>
          ))}

          <Link href="/configurateur" className={styles.backLink}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 4l-6 6 6 6" />
            </svg>
            Continuer le chiffrage
          </Link>
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryTitle}>Récapitulatif</div>
          {remise > 0 && (
            <div className={styles.srow}>
              <span>Remise</span>
              <span>−{formatEUR(remise)}</span>
            </div>
          )}
          <div className={styles.srow}>
            <span>Sous-total HT</span>
            <span>{formatEUR(subHt)}</span>
          </div>
          <div className={`${styles.srow} ${styles.srowBorder}`}>
            <span>TVA 20 %</span>
            <span>{formatEUR(tva)}</span>
          </div>
          <div className={styles.totalBox}>
            <div className={styles.totalLbl}>Total HT</div>
            <div className={styles.totalVal}>{formatEUR(subHt)}</div>
            <div className={styles.totalTtc}>({formatEUR(ttc)} TTC)</div>
          </div>

          <button
            type="button"
            className={styles.checkout}
            onClick={onCheckout}
            disabled={pending}
          >
            {pending ? "Envoi…" : "Demander la production"}
          </button>

          {feedback && (
            <div
              className={`${styles.feedback} ${
                feedback.kind === "ok" ? styles.feedbackOk : styles.feedbackErr
              }`}
            >
              {feedback.text}
            </div>
          )}

          <p className={styles.note}>
            Devis indicatif HT, sous réserve de validation technique.
            <br />
            Paiement à réception de facture. Sans engagement, validation par notre
            équipe sous 24 h.
          </p>
        </div>
      </div>
    </main>
  );
}
