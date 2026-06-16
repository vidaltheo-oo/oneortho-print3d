"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatEUR } from "@/lib/cart";
import {
  fetchOrders,
  clientStatusMeta,
  formatDate,
  pieceCount,
  TRACKER_STEPS,
  type Order,
} from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
import { useI18n } from "@/lib/i18n/provider";
import { localeOf, type TFunc } from "@/lib/i18n/messages";
import styles from "./mescommandes.module.css";

const Chevron = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={styles.chevron}
  >
    <path d="M8 4l6 6-6 6" />
  </svg>
);

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M3 7.5L6 10.5L11 4.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PieceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 120 120" fill="none">
    <polygon points="60,12 104,36 60,60 16,36" fill="#AAE66E" fillOpacity=".55" stroke="#004B32" strokeWidth="4" strokeLinejoin="round" />
    <polygon points="16,36 60,60 60,108 16,84" fill="#004B32" fillOpacity=".16" stroke="#004B32" strokeWidth="4" strokeLinejoin="round" />
    <polygon points="104,36 60,60 60,108 104,84" fill="#004B32" fillOpacity=".10" stroke="#004B32" strokeWidth="4" strokeLinejoin="round" />
  </svg>
);

function lbl(t: TFunc, prefix: string, key: string | null): string {
  return key ? t(`${prefix}.${key}`) : "—";
}

function pieceWord(t: TFunc, n: number): string {
  return t(n > 1 ? "unit.piece.other" : "unit.piece.one");
}

function OrderRow({
  order,
  past,
  onOpen,
}: {
  order: Order;
  past: boolean;
  onOpen: () => void;
}) {
  const { t, lang } = useI18n();
  const meta = clientStatusMeta(order);
  const n = pieceCount(order);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${styles.orderRow} ${past ? styles.orderRowPast : ""}`}
    >
      <div className={styles.orderMain}>
        <div className={styles.orderHead}>
          <span className={styles.orderId}>{order.numero}</span>
          <span className={styles.badge} style={{ background: meta.bg, color: meta.fg }}>
            {t(`status.${meta.key}`)}
          </span>
        </div>
        <div className={styles.orderMeta}>
          {formatDate(order.createdAt, localeOf(lang))} · {n} {pieceWord(t, n)} ·{" "}
          {lbl(t, "nature", order.natureApplication)}
        </div>
      </div>
      <div className={styles.orderAmount}>
        <div className={styles.orderAmountVal}>{formatEUR(order.montantHt)}</div>
        <div className={styles.orderAmountLbl}>{t("common.ht")}</div>
      </div>
      <Chevron />
    </button>
  );
}

function Tracker({ order }: { order: Order }) {
  const { t } = useI18n();
  const meta = clientStatusMeta(order);

  if (meta.cancelled) {
    return (
      <div className={styles.tracker}>
        <div className={styles.cancelled}>
          <span className={styles.cancelledIcon}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#C62828" strokeWidth="1.9" strokeLinecap="round">
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </span>
          <div>
            <div className={styles.cancelledTitle}>{t("orders.cancelledTitle")}</div>
            <div className={styles.cancelledText}>{t("orders.cancelledText")}</div>
          </div>
        </div>
      </div>
    );
  }

  const curIdx = meta.trackerIdx;
  const fillRatio = meta.delivered ? 1 : curIdx / (TRACKER_STEPS.length - 1);
  const fillWidth = `calc((100% - 16%) * ${fillRatio})`;

  return (
    <div className={styles.tracker}>
      <div className={styles.trackerRow}>
        <div className={styles.trackBg} />
        <div className={styles.trackFill} style={{ width: fillWidth }} />
        {TRACKER_STEPS.map((step, i) => {
          const done = meta.delivered || i < curIdx;
          const current = !meta.delivered && i === curIdx;
          return (
            <div key={step} className={styles.step}>
              <span
                className={`${styles.dot} ${done ? styles.dotDone : ""} ${
                  current ? styles.dotCurrent : ""
                }`}
              >
                {done && <Check />}
              </span>
              <span
                className={`${styles.stepLabel} ${
                  done || current ? styles.stepLabelActive : ""
                } ${current ? styles.stepLabelCurrent : ""}`}
              >
                {t(`tracker.${step}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MesCommandesView() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [clientAddress, setClientAddress] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const meta = userData.user?.user_metadata as
        | { raison_sociale?: string; adresse_facturation?: string }
        | undefined;
      setClientName(meta?.raison_sociale ?? userData.user?.email ?? "");
      setClientAddress(meta?.adresse_facturation ?? "");

      const result = await fetchOrders();
      if (!result.ok) {
        if (result.reason === "auth") {
          router.replace("/connexion");
          return;
        }
        setDbError(true);
        setLoading(false);
        return;
      }
      setOrders(result.orders);
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <main className={styles.wrap}>
        <h1 className={styles.title}>{t("space.title")}</h1>
        <p className={styles.loading}>{t("orders.loading")}</p>
      </main>
    );
  }

  if (dbError) {
    return (
      <main className={styles.wrap}>
        <h1 className={styles.title}>{t("space.title")}</h1>
        <p className={styles.loading}>{t("orders.loadError")}</p>
      </main>
    );
  }

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  if (selected) {
    const meta = clientStatusMeta(selected);
    const n = pieceCount(selected);
    return (
      <main className={styles.wrap}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => setSelectedId(null)}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4l-6 6 6 6" />
          </svg>
          {t("orders.back")}
        </button>

        <div className={styles.detailHead}>
          <h1 className={styles.title} style={{ margin: 0 }}>
            {selected.numero}
          </h1>
          <span className={styles.badge} style={{ background: meta.bg, color: meta.fg }}>
            {t(`status.${meta.key}`)}
          </span>
        </div>
        <p className={styles.detailSub}>
          {t("orders.placedOn", { date: formatDate(selected.createdAt, localeOf(lang)) })}{" "}
          · {n} {pieceWord(t, n)}
        </p>
        <p className={styles.detailAmount}>
          {formatEUR(selected.montantHt)} {t("common.ht")}
          <small>
            ({formatEUR(selected.montantTtc)} {t("common.ttc")})
          </small>
        </p>

        <Tracker order={selected} />

        <div className={styles.detailCols}>
          <div className={styles.piecesCard}>
            <div className={styles.cardTitle}>{t("orders.piecesTitle", { n })}</div>
            {selected.pieces.map((p, i) => (
              <div key={i} className={styles.pieceRow}>
                <span className={styles.pieceIcon}>
                  <PieceIcon />
                </span>
                <div className={styles.pieceInfo}>
                  <div className={styles.pieceName}>{p.nom_fichier}</div>
                  <div className={styles.pieceOpts}>
                    PA2200 · {lbl(t, "couleur", p.couleur)} ·{" "}
                    {lbl(t, "finition", p.finition)}
                  </div>
                </div>
                <div className={styles.pieceQty}>× {p.quantite}</div>
              </div>
            ))}
          </div>

          <div className={styles.deliveryCard}>
            <div className={styles.cardTitle}>{t("orders.delivery")}</div>
            <div className={styles.deliveryText}>
              {clientName || "—"}
              {clientAddress ? (
                <>
                  <br />
                  {clientAddress}
                </>
              ) : null}
            </div>
            <div className={styles.deliveryNote}>
              {t("orders.deliveryNote1")}
              <br />
              {t("orders.deliveryNote2")}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className={styles.wrap}>
        <h1 className={styles.title}>{t("space.title")}</h1>
        {clientName && <p className={styles.sub}>{clientName}</p>}
        <div className={styles.empty}>
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#E2DED2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto" }}>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
          </svg>
          <p className={styles.emptyText}>{t("orders.emptyText")}</p>
          <Link href="/configurateur" className={styles.emptyCta}>
            {t("cart.emptyCta")}
          </Link>
        </div>
      </main>
    );
  }

  // En cours = ni livrée ni annulée (statut effectif tenant compte du devis).
  const current = orders.filter((o) => {
    const m = clientStatusMeta(o);
    return !m.cancelled && !m.delivered;
  });
  const past = orders.filter((o) => {
    const m = clientStatusMeta(o);
    return m.cancelled || m.delivered;
  });

  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>{t("space.title")}</h1>
      {clientName && <p className={styles.sub}>{clientName}</p>}

      {current.length > 0 && (
        <>
          <div className={styles.sectionLabel}>{t("orders.sectionCurrent")}</div>
          <div className={styles.list}>
            {current.map((o) => (
              <OrderRow key={o.id} order={o} past={false} onOpen={() => setSelectedId(o.id)} />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <div className={styles.sectionLabel}>{t("orders.sectionPast")}</div>
          <div className={styles.list}>
            {past.map((o) => (
              <OrderRow key={o.id} order={o} past onOpen={() => setSelectedId(o.id)} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
