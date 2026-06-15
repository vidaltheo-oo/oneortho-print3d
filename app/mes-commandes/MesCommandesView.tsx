"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  COULEUR_LABELS,
  FINITION_LABELS,
  NATURE_LABELS,
  labelOf,
  formatEUR,
} from "@/lib/cart";
import {
  fetchOrders,
  statutMeta,
  isCurrent,
  formatDate,
  pieceCount,
  TRACKER_STEPS,
  type Order,
} from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";
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
    <polygon
      points="60,12 104,36 60,60 16,36"
      fill="#AAE66E"
      fillOpacity=".55"
      stroke="#004B32"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <polygon
      points="16,36 60,60 60,108 16,84"
      fill="#004B32"
      fillOpacity=".16"
      stroke="#004B32"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <polygon
      points="104,36 60,60 60,108 104,84"
      fill="#004B32"
      fillOpacity=".10"
      stroke="#004B32"
      strokeWidth="4"
      strokeLinejoin="round"
    />
  </svg>
);

function pieceOpts(p: Order["pieces"][number]): string {
  return `PA2200 · ${labelOf(COULEUR_LABELS, p.couleur)} · ${labelOf(
    FINITION_LABELS,
    p.finition
  )}`;
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
  const meta = statutMeta(order.statut);
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
          <span
            className={styles.badge}
            style={{ background: meta.bg, color: meta.fg }}
          >
            {meta.label}
          </span>
        </div>
        <div className={styles.orderMeta}>
          {formatDate(order.createdAt)} · {n} pièce{n > 1 ? "s" : ""} ·{" "}
          {labelOf(NATURE_LABELS, order.natureApplication)}
        </div>
      </div>
      <div className={styles.orderAmount}>
        <div className={styles.orderAmountVal}>{formatEUR(order.montantHt)}</div>
        <div className={styles.orderAmountLbl}>HT</div>
      </div>
      <Chevron />
    </button>
  );
}

function Tracker({ order }: { order: Order }) {
  const meta = statutMeta(order.statut);

  if (meta.cancelled) {
    return (
      <div className={styles.tracker}>
        <div className={styles.cancelled}>
          <span className={styles.cancelledIcon}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              stroke="#C62828"
              strokeWidth="1.9"
              strokeLinecap="round"
            >
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </span>
          <div>
            <div className={styles.cancelledTitle}>Commande annulée</div>
            <div className={styles.cancelledText}>
              Ce devis n&apos;a pas été retenu. Contactez-nous pour le relancer.
            </div>
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
        {TRACKER_STEPS.map((label, i) => {
          const done = meta.delivered || i < curIdx;
          const current = !meta.delivered && i === curIdx;
          return (
            <div key={label} className={styles.step}>
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
                {label}
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
        <h1 className={styles.title}>Mon espace</h1>
        <p className={styles.loading}>Chargement de vos commandes…</p>
      </main>
    );
  }

  if (dbError) {
    return (
      <main className={styles.wrap}>
        <h1 className={styles.title}>Mon espace</h1>
        <p className={styles.loading}>
          Impossible de charger vos commandes pour le moment.
        </p>
      </main>
    );
  }

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  if (selected) {
    const meta = statutMeta(selected.statut);
    const n = pieceCount(selected);
    return (
      <main className={styles.wrap}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => setSelectedId(null)}
        >
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
          Mes commandes
        </button>

        <div className={styles.detailHead}>
          <h1 className={styles.title} style={{ margin: 0 }}>
            {selected.numero}
          </h1>
          <span
            className={styles.badge}
            style={{ background: meta.bg, color: meta.fg }}
          >
            {meta.label}
          </span>
        </div>
        <p className={styles.detailSub}>
          Commande passée le {formatDate(selected.createdAt)} · {n} pièce
          {n > 1 ? "s" : ""}
        </p>
        <p className={styles.detailAmount}>
          {formatEUR(selected.montantHt)} HT
          <small>({formatEUR(selected.montantTtc)} TTC)</small>
        </p>

        <Tracker order={selected} />

        <div className={styles.detailCols}>
          <div className={styles.piecesCard}>
            <div className={styles.cardTitle}>Pièces ({n})</div>
            {selected.pieces.map((p, i) => (
              <div key={i} className={styles.pieceRow}>
                <span className={styles.pieceIcon}>
                  <PieceIcon />
                </span>
                <div className={styles.pieceInfo}>
                  <div className={styles.pieceName}>{p.nom_fichier}</div>
                  <div className={styles.pieceOpts}>{pieceOpts(p)}</div>
                </div>
                <div className={styles.pieceQty}>× {p.quantite}</div>
              </div>
            ))}
          </div>

          <div className={styles.deliveryCard}>
            <div className={styles.cardTitle}>Livraison</div>
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
              Paiement à réception de facture.
              <br />
              Facture émise à l&apos;expédition.
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className={styles.wrap}>
        <h1 className={styles.title}>Mon espace</h1>
        {clientName && <p className={styles.sub}>{clientName}</p>}
        <div className={styles.empty}>
          <svg
            width="46"
            height="46"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#E2DED2"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: "0 auto" }}
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
          </svg>
          <p className={styles.emptyText}>Vous n&apos;avez pas encore de commande.</p>
          <Link href="/configurateur" className={styles.emptyCta}>
            Configurer une pièce
          </Link>
        </div>
      </main>
    );
  }

  const current = orders.filter((o) => isCurrent(o.statut));
  const past = orders.filter((o) => !isCurrent(o.statut));

  return (
    <main className={styles.wrap}>
      <h1 className={styles.title}>Mon espace</h1>
      {clientName && <p className={styles.sub}>{clientName}</p>}

      {current.length > 0 && (
        <>
          <div className={styles.sectionLabel}>En cours</div>
          <div className={styles.list}>
            {current.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                past={false}
                onOpen={() => setSelectedId(o.id)}
              />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Passées</div>
          <div className={styles.list}>
            {past.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                past
                onOpen={() => setSelectedId(o.id)}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
