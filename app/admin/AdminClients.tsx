"use client";

import { useEffect, useState } from "react";
import {
  COMMANDE_STATUT_META,
  formatDateFr,
  formatEUR2,
  fetchClientOrders,
  type AdminClient,
  type AdminClientOrder,
} from "@/lib/admin";
import styles from "./admin.module.css";

const GRID = "1.6fr 1.3fr 1.6fr 130px 110px 96px";

function initials(name: string | null | undefined): string {
  if (!name) return "??";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "??"
  );
}

export default function AdminClients({ clients }: { clients: AdminClient[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminClient | null>(null);
  const [orders, setOrders] = useState<AdminClientOrder[] | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!selected) {
      setOrders(null);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    fetchClientOrders(selected.id).then((res) => {
      if (cancelled) return;
      setOrders(res);
      setOrdersLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const q = query.trim().toLowerCase();
  const rows = q
    ? clients.filter(
        (c) =>
          (c.raisonSociale ?? "").toLowerCase().includes(q) ||
          (c.nom ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
      )
    : clients;

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.search} style={{ maxWidth: 360 }}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Rechercher par nom ou email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.count}>
        {rows.length} client{rows.length > 1 ? "s" : ""}
      </div>

      <div className={styles.table}>
        <div className={styles.tHead} style={{ gridTemplateColumns: GRID }}>
          <div className={styles.th}>Raison sociale</div>
          <div className={styles.th}>Contact</div>
          <div className={styles.th}>Email</div>
          <div className={styles.th}>Téléphone</div>
          <div className={styles.th}>Inscription</div>
          <div className={styles.th} style={{ textAlign: "right" }}>
            Commandes
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Aucun client</div>
            <div className={styles.emptyMsg}>
              Aucun client ne correspond à cette recherche.
            </div>
          </div>
        ) : (
          rows.map((c) => (
            <div
              key={c.id}
              className={styles.tRow}
              style={{ gridTemplateColumns: GRID, cursor: "pointer" }}
              onClick={() => setSelected(c)}
            >
              <div
                className={styles.td}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <span
                  className={styles.sideAvatar}
                  style={{ width: 30, height: 30, fontSize: 11 }}
                >
                  {initials(c.raisonSociale)}
                </span>
                <span className={styles.cellName}>
                  {c.raisonSociale ?? "—"}
                </span>
              </div>
              <div className={styles.td}>{c.nom ?? "—"}</div>
              <div className={styles.td}>{c.email ?? "—"}</div>
              <div className={styles.td}>{c.telephone ?? "—"}</div>
              <div className={styles.td}>{formatDateFr(c.createdAt)}</div>
              <div
                className={`${styles.td} ${styles.cellStrong}`}
                style={{ textAlign: "right" }}
              >
                {c.ordersCount}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className={styles.drawerOverlay} onClick={() => setSelected(null)}>
          <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHead}>
              <span
                className={styles.sideAvatar}
                style={{ width: 44, height: 44, fontSize: 15 }}
              >
                {initials(selected.raisonSociale)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className={styles.drawerTitle}>
                  {selected.raisonSociale ?? "—"}
                </div>
                <div className={styles.drawerSub}>
                  {selected.typeActivite ?? "Client"}
                </div>
              </div>
              <button
                type="button"
                className={styles.drawerClose}
                onClick={() => setSelected(null)}
                aria-label="Fermer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <div className={styles.drawerSection}>Informations</div>
            <dl className={styles.infoList}>
              <DetailRow label="Contact" value={selected.nom} />
              <DetailRow label="Fonction" value={selected.fonction} />
              <DetailRow label="Email" value={selected.email} />
              <DetailRow label="Téléphone" value={selected.telephone} />
              <DetailRow label="SIRET / N° client" value={selected.siret} />
              <DetailRow label="TVA intracom." value={selected.tvaIntracom} />
              <DetailRow
                label="Adresse facturation"
                value={selected.adresseFacturation}
              />
              <DetailRow
                label="Adresse livraison"
                value={selected.adresseLivraison}
              />
              <DetailRow
                label="Inscription"
                value={formatDateFr(selected.createdAt)}
              />
            </dl>

            <div className={styles.drawerSection}>
              Commandes ({selected.ordersCount})
            </div>
            {ordersLoading ? (
              <div className={styles.drawerMuted}>Chargement…</div>
            ) : orders && orders.length > 0 ? (
              <div className={styles.histList}>
                {orders.map((o) => {
                  const meta = COMMANDE_STATUT_META[o.statut];
                  return (
                    <div key={o.id} className={styles.histRow}>
                      <span className={styles.cellStrong}>{o.numero}</span>
                      <span className={styles.drawerMuted}>
                        {formatDateFr(o.createdAt)}
                      </span>
                      <span
                        className={styles.badge}
                        style={{ background: meta.bg, color: meta.fg }}
                      >
                        {meta.label}
                      </span>
                      <span className={styles.cellAmount}>
                        {formatEUR2(o.montantHt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.drawerMuted}>Aucune commande.</div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <>
      <dt className={styles.infoLabel}>{label}</dt>
      <dd className={styles.infoValue}>{value || "—"}</dd>
    </>
  );
}
