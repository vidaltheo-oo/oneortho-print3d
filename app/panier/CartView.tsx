"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  loadCart,
  saveCart,
  cartPieceCount,
  formatEUR,
  CART_CHANGED_EVENT,
  type CartEntry,
} from "@/lib/cart";
import { submitCart } from "@/lib/checkout";
import { notifyOrderCreated } from "@/lib/notifications";
import { useT } from "@/lib/i18n/provider";
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
  const t = useT();
  // Libellé traduit pour une valeur d'option (couleur/finition/délai/nature).
  const lbl = (prefix: string, key: string | null) =>
    key ? t(`${prefix}.${key}`) : "—";
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
        text: t("cart.fb.sent", { n: result.count }),
      });
      return;
    }

    switch (result.reason) {
      case "auth":
        router.push("/connexion");
        break;
      case "no_client":
        setFeedback({ kind: "err", text: t("cart.fb.noClient") });
        break;
      case "empty":
        setFeedback({ kind: "err", text: t("cart.empty") });
        break;
      default:
        setFeedback({ kind: "err", text: t("cart.fb.error") });
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
        <h1 className={styles.title}>{t("cart.title")}</h1>
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
          <p className={styles.emptyText}>{t("cart.empty")}</p>
          <Link href="/configurateur" className={styles.emptyCta}>
            {t("cart.emptyCta")}
          </Link>
        </div>
      </main>
    );
  }

  const cfgCount = cart.length;
  const cfgLabel = t(
    cfgCount > 1 ? "unit.configuration.other" : "unit.configuration.one"
  );
  const pieceLabel = t(pieceCount > 1 ? "unit.piece.other" : "unit.piece.one");

  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>{t("cart.title")}</h1>
      <p className={styles.sub}>
        {cfgCount} {cfgLabel} · {pieceCount} {pieceLabel}
      </p>

      <div className={styles.layout}>
        <div className={styles.list}>
          {cart.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryHead}>
                <span className={styles.badge}>
                  {lbl("nature", entry.nature_application)}
                </span>
                <span className={styles.numero}>{entry.numero}</span>
                <span className={styles.delai}>{lbl("delai", entry.delai)}</span>
                <span className={styles.entryTotal}>
                  {formatEUR(entry.montant_ttc)}
                </span>
                <button
                  type="button"
                  className={styles.remove}
                  title={t("cart.remove")}
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
                      PA2200 · {lbl("couleur", p.couleur)} ·{" "}
                      {lbl("finition", p.finition)} ·{" "}
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
            {t("cart.back")}
          </Link>
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryTitle}>{t("cart.summary")}</div>
          {remise > 0 && (
            <div className={styles.srow}>
              <span>{t("cart.discount")}</span>
              <span>−{formatEUR(remise)}</span>
            </div>
          )}
          <div className={styles.srow}>
            <span>{t("cart.subtotalHt")}</span>
            <span>{formatEUR(subHt)}</span>
          </div>
          <div className={`${styles.srow} ${styles.srowBorder}`}>
            <span>{t("cart.vat")}</span>
            <span>{formatEUR(tva)}</span>
          </div>
          <div className={styles.totalBox}>
            <div className={styles.totalLbl}>{t("cart.totalHt")}</div>
            <div className={styles.totalVal}>{formatEUR(subHt)}</div>
            <div className={styles.totalTtc}>
              ({formatEUR(ttc)} {t("common.ttc")})
            </div>
          </div>

          <button
            type="button"
            className={styles.checkout}
            onClick={onCheckout}
            disabled={pending}
          >
            {pending ? t("cart.checkingOut") : t("cart.checkout")}
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

          <p className={styles.note}>{t("cart.note")}</p>
        </div>
      </div>
    </main>
  );
}
