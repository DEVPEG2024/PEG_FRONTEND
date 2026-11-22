/*
 * Page Master Print — widgets de la vue d'ensemble et de l'onglet « Compte et
 * suivi ». Styles : hubStyles.ts (préfixe hx-). Règles : utils/masterPrintHub.ts
 * et utils/masterPrintDashboard.ts.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  TbAlertOctagon,
  TbAlertTriangle,
  TbArrowDownRight,
  TbArrowUpRight,
  TbBellRinging,
  TbChartDonut3,
  TbCircleCheck,
  TbClockHour4,
  TbForms,
  TbInfoCircle,
  TbLink,
  TbPackage,
  TbPhoto,
  TbPhotoOff,
  TbPlugConnected,
  TbPrinter,
  TbReceipt2,
  TbRotateClockwise2,
  TbTruckDelivery,
} from 'react-icons/tb';
import type { MpStatus } from '@/@types/masterPrint';
import type {
  MpDashCatalog,
  MpDashOrders,
} from '@/@types/masterPrintDashboard';
import type { MpWebhooksOverview } from '@/@types/masterPrintOrders';
import type { MpPricesOverview } from '@/@types/masterPrintPrices';
import {
  GroupedBars,
  Kpi,
  Ring,
  Spark,
  tint,
} from '@/components/shared/hub/HubWidgets';
import { fmtEur } from '@/utils/masterPrint';
import {
  type DashAction,
  ago,
  compactEur,
  marginRate,
  monthsEmpty,
  offerPath,
  paymentModeLabel,
  projectPath,
  shortMonth,
} from '@/utils/masterPrintDashboard';
import {
  STAGE_INK,
  deltaPct,
  purchaseSeries,
  ringValue,
  stations,
} from '@/utils/masterPrintHub';

// Couleurs des séries (validées sur le fond des cartes, mode sombre).
export const SALE_INK = '#7c6cf0';
export const PURCHASE_INK = '#d95926';
const MUTED = 'rgba(226,232,255,0.45)';
const SALES_SERIES = [
  { key: 'sale', label: 'Ventes', color: SALE_INK },
  { key: 'purchase', label: 'Achats', color: PURCHASE_INK },
];

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

// ── Motifs d'imprimerie ─────────────────────────────────────────────────────

/** Barre de contrôle couleur : cyan, magenta, jaune, noir (blanc sur fond sombre). */
export const ColorBar = () => (
  <span className="hx-colorbar" aria-hidden="true">
    <span style={{ background: '#1f9cc6' }} />
    <span style={{ background: '#e0559f' }} />
    <span style={{ background: '#c98500' }} />
    <span style={{ background: '#e8ecf8' }} />
  </span>
);

/** Repère de calage. */
const RegMark = () => (
  <svg
    className="hx-regmark"
    viewBox="0 0 40 40"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <circle cx="20" cy="20" r="11" />
    <circle cx="20" cy="20" r="5" />
    <path d="M20 2v36M2 20h36" />
  </svg>
);

// ── Atelier : où en sont les commandes ──────────────────────────────────────

export const Atelier = ({
  orders,
  sandbox,
  loading,
  problem,
  onOpenOrder,
}: {
  orders: MpDashOrders | null;
  sandbox: boolean;
  loading: boolean;
  problem: string | null;
  onOpenOrder: (orderId: string) => void;
}) => {
  const line = orders ? stations(orders) : null;
  const inks = line?.stations.map((s) => s.ink) ?? [];
  return (
    <section
      className="hx-card hx-hero hx-s12"
      data-testid="hx-atelier"
      aria-labelledby="hx-atelier-title"
    >
      <RegMark />
      <h2 className="hx-hero-title" id="hx-atelier-title">
        Votre atelier
      </h2>
      <p className="hx-hero-lead">
        {!orders ? (
          loading ? (
            'Lecture des commandes…'
          ) : (
            problem || 'Commandes illisibles pour le moment.'
          )
        ) : !orders.counted ? (
          'Aucune commande pour l’instant. Chaque projet envoyé à Master Print apparaîtra ici, étape par étape.'
        ) : (
          <>
            <strong>
              {plural(
                orders.inProgress,
                'commande en cours',
                'commandes en cours'
              )}
            </strong>{' '}
            chez Master Print
            {orders.todo ? (
              <>
                , dont <strong>{orders.todo}</strong>{' '}
                {orders.todo > 1 ? 'attendent' : 'attend'} une action de votre
                part.
              </>
            ) : (
              '. Rien ne vous attend.'
            )}
          </>
        )}
      </p>

      {line && orders && orders.counted > 0 && (
        <>
          <div
            className="hx-line"
            style={{ '--n': line.stations.length } as CSSProperties}
            role="list"
            aria-label="Étapes de fabrication"
          >
            <span
              className="hx-track"
              aria-hidden="true"
              style={
                {
                  background: `linear-gradient(var(--dir, 90deg), ${inks.join(', ')})`,
                } as CSSProperties
              }
            />
            {line.stations.map((s) => (
              <div
                key={s.code}
                role="listitem"
                className="hx-station"
                data-testid="hx-station"
                style={{ '--ink': s.ink } as CSSProperties}
              >
                <span
                  className={`hx-node${s.count ? '' : ' hx-node--empty'}${s.waitingOnYou ? ' hx-node--wait' : ''}`}
                >
                  {s.count}
                </span>
                <span className="hx-station-text">
                  <span className="hx-station-label">{s.label}</span>
                  {s.waitingOnYou && (
                    <span
                      className="hx-station-note"
                      style={{
                        color: s.ink === STAGE_INK.files ? '#f2c14e' : '#fff',
                      }}
                    >
                      À vous de jouer
                    </span>
                  )}
                  {(s.orders.length > 0 || s.more > 0) && (
                    <span className="hx-chips">
                      {s.orders.map((o) => (
                        <button
                          key={o.orderId}
                          type="button"
                          className={`hx-chip${o.danger ? ' hx-chip--danger' : ''}`}
                          onClick={() => onOpenOrder(o.orderId)}
                          title={`Ouvrir la commande ${o.orderId}`}
                        >
                          {o.short}
                        </button>
                      ))}
                      {s.more > 0 && (
                        <span className="hx-chip hx-chip--more">+{s.more}</span>
                      )}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="hx-hero-foot">
            {line.cancelled > 0 && (
              <span>
                {plural(
                  line.cancelled,
                  'commande annulée',
                  'commandes annulées'
                )}
                , non facturée{line.cancelled > 1 ? 's' : ''}
              </span>
            )}
            {orders.excluded.outsidePeg > 0 && (
              <span>
                {plural(
                  orders.excluded.outsidePeg,
                  'commande passée hors PEG',
                  'commandes passées hors PEG'
                )}{' '}
                avec la même clé, non comptée
                {orders.excluded.outsidePeg > 1 ? 's' : ''}
              </span>
            )}
            {sandbox && (
              <span>Mode essai : rien n’est fabriqué ni facturé</span>
            )}
          </div>
        </>
      )}
    </section>
  );
};

// ── Chiffres clés ───────────────────────────────────────────────────────────

export const KpiRow = ({
  orders,
  loading,
  onOpenTodo,
}: {
  orders: MpDashOrders | null;
  loading: boolean;
  onOpenTodo: () => void;
}) => {
  const dash = loading ? '…' : '—';
  const m = orders?.thisMonth;
  const prev = orders?.lastMonth;
  const delta = m && prev ? deltaPct(m.purchase, prev.purchase) : null;
  const rate = m ? marginRate(m) : null;
  const danger = !!orders?.todoOrders.some((o) =>
    o.alerts.some((a) => a.level === 'danger')
  );
  const todoInk = !orders?.todo ? '#34d399' : danger ? '#f87171' : '#fbbf24';
  const firstAlert = orders?.todoOrders[0]?.alerts[0]?.label;
  return (
    <>
      <Kpi
        label="En cours"
        icon={<TbPrinter />}
        accent="#9d92ff"
        value={orders ? String(orders.inProgress) : dash}
        foot={
          orders ? (
            <span>
              sur{' '}
              {plural(orders.counted, 'commande passée', 'commandes passées')}
            </span>
          ) : null
        }
      />
      <Kpi
        label="Vous attendent"
        icon={orders?.todo ? <TbBellRinging /> : <TbCircleCheck />}
        accent={todoInk}
        value={orders ? String(orders.todo) : dash}
        foot={
          orders ? (
            <span>
              {orders.todo
                ? firstAlert || 'Action attendue'
                : 'Rien en attente'}
            </span>
          ) : null
        }
        onClick={orders?.todo ? onOpenTodo : undefined}
        testId="hx-kpi-todo"
      />
      <Kpi
        label="Achats ce mois"
        icon={<TbReceipt2 />}
        accent={PURCHASE_INK}
        value={m ? fmtEur(m.purchase) : dash}
        foot={
          orders && m ? (
            <>
              <span>
                {delta == null ? (
                  `${prev?.label.split(' ')[0] ?? 'mois dernier'} : ${fmtEur(prev?.purchase)}`
                ) : (
                  <span className="hx-delta">
                    {delta >= 0 ? (
                      <TbArrowUpRight aria-hidden="true" />
                    ) : (
                      <TbArrowDownRight aria-hidden="true" />
                    )}
                    {delta >= 0 ? '+' : ''}
                    {delta} % sur un mois
                  </span>
                )}
              </span>
              <Spark
                values={purchaseSeries(orders.months)}
                color={PURCHASE_INK}
              />
            </>
          ) : null
        }
      />
      <Kpi
        label="Marge ce mois"
        icon={<TbChartDonut3 />}
        accent="#34d399"
        value={m ? fmtEur(m.margin) : dash}
        foot={
          m ? (
            m.margin == null ? (
              <span>Aucun projet chiffré ce mois-ci</span>
            ) : (
              <>
                <span>
                  des ventes, sur{' '}
                  {plural(m.marginProjects, 'projet', 'projets')}
                </span>
                <Ring
                  value={Math.max(0, Math.round(rate ?? 0))}
                  color={m.margin < 0 ? '#f87171' : '#34d399'}
                  size={34}
                  stroke={4}
                  label={`Taux de marge ${rate ?? 0} %`}
                />
              </>
            )
          ) : null
        }
      />
    </>
  );
};

// ── À faire ─────────────────────────────────────────────────────────────────

const LEVEL_LOOK: Record<
  DashAction['level'],
  { color: string; icon: ReactNode }
> = {
  danger: { color: '#f87171', icon: <TbAlertOctagon /> },
  warning: { color: '#fbbf24', icon: <TbAlertTriangle /> },
  info: { color: '#9d92ff', icon: <TbInfoCircle /> },
};

export const ActionsCard = ({
  actions,
  loading,
  subscribing,
  notice,
  onSubscribe,
}: {
  actions: DashAction[];
  loading: boolean;
  subscribing: boolean;
  notice: { ok: boolean; text: string } | null;
  onSubscribe: () => void;
}) => (
  <section
    className="hx-card hx-s7"
    data-testid="hx-actions"
    aria-labelledby="hx-actions-title"
  >
    <div className="hx-card-head">
      <div>
        <h2 className="hx-card-title" id="hx-actions-title">
          À faire
        </h2>
        <p className="hx-card-note">Le plus important d’abord.</p>
      </div>
    </div>
    {notice && (
      <p
        className="hx-muted"
        style={{ marginBottom: 10, color: notice.ok ? '#86efac' : '#fca5a5' }}
        role="status"
      >
        {notice.text}
      </p>
    )}
    {loading && !actions.length ? (
      <p className="hx-muted">Lecture…</p>
    ) : !actions.length ? (
      <div className="hx-allgood">
        <TbCircleCheck size={26} color="#34d399" aria-hidden="true" />
        <div>
          <p className="hx-action-title">Tout est en ordre</p>
          <p className="hx-action-detail">
            Aucune commande, aucun prix ni aucune fiche n’attend votre
            intervention.
          </p>
        </div>
      </div>
    ) : (
      <ul className="hx-actions">
        {actions.map((a) => {
          const look = LEVEL_LOOK[a.level];
          return (
            <li
              key={a.key}
              className="hx-action"
              data-testid="hx-action"
              data-level={a.level}
            >
              <span
                className="hx-action-icon"
                style={{
                  background: tint(look.color, 0.14),
                  color: look.color,
                }}
                aria-hidden="true"
              >
                {look.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <p className="hx-action-title">{a.title}</p>
                {a.detail && <p className="hx-action-detail">{a.detail}</p>}
              </div>
              {a.action === 'subscribe' ? (
                <button
                  type="button"
                  className="hx-btn hx-btn--primary hx-action-cta"
                  onClick={onSubscribe}
                  disabled={subscribing}
                >
                  <TbPlugConnected aria-hidden="true" />
                  {subscribing ? 'Abonnement…' : a.cta}
                </button>
              ) : a.to ? (
                <Link to={a.to} className="hx-btn hx-btn--ghost hx-action-cta">
                  {a.cta || 'Ouvrir'}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

// ── Catalogue relié ─────────────────────────────────────────────────────────

export const CatalogCard = ({
  catalog,
  prices,
  loading,
  problem,
  onOpen,
}: {
  catalog: MpDashCatalog | null;
  prices: MpPricesOverview | null;
  loading: boolean;
  problem: string | null;
  onOpen: () => void;
}) => {
  const last = prices?.last;
  return (
    <section
      className="hx-card hx-s5"
      data-testid="hx-catalog"
      aria-labelledby="hx-catalog-title"
    >
      <div className="hx-card-head">
        <div>
          <h2 className="hx-card-title" id="hx-catalog-title">
            Catalogue relié
          </h2>
          {catalog && (
            <p className="hx-card-note">
              {plural(catalog.linked, 'produit importé', 'produits importés')}{' '}
              dans PEG
            </p>
          )}
        </div>
        <button type="button" className="hx-link" onClick={onOpen}>
          Ouvrir le catalogue
        </button>
      </div>
      {!catalog ? (
        <p className="hx-muted">
          {loading
            ? 'Lecture…'
            : problem || 'Catalogue illisible pour le moment.'}
        </p>
      ) : !catalog.linked ? (
        <p className="hx-muted">
          Aucun produit importé pour l’instant : cherchez-en dans le catalogue
          et importez-les dans PEG.
        </p>
      ) : (
        <>
          <div className="hx-rings">
            {[
              { name: 'En vente', n: catalog.active, color: '#9d92ff' },
              {
                name: 'Formulaire client',
                n: catalog.withOffer,
                color: '#1f9cc6',
              },
              { name: 'Avec photos', n: catalog.withPhotos, color: '#e0559f' },
              { name: 'Prix suivis', n: catalog.tracked, color: '#c98500' },
            ].map((r) => (
              <div key={r.name} className="hx-ring" data-testid="hx-ring">
                <Ring
                  value={ringValue(r.n, catalog.linked)}
                  color={r.color}
                  label={`${r.name} : ${r.n} sur ${catalog.linked}`}
                />
                <div className="hx-ring-text">
                  <p className="hx-ring-name">{r.name}</p>
                  <p className="hx-ring-sub">
                    {r.n} sur {catalog.linked}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {catalog.withoutOffer.length > 0 && (
            <ul
              className="hx-todo-list"
              aria-label="Produits sans formulaire client"
            >
              {catalog.withoutOffer.slice(0, 3).map((p) => (
                <li key={p.documentId}>
                  <span>{p.name}</span>
                  <Link to={offerPath(p.documentId)} className="hx-link">
                    Régler le formulaire
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="hx-muted" style={{ marginTop: 14, fontSize: 12.5 }}>
            {prices?.running
              ? 'Vérification des prix en cours…'
              : last
                ? `Prix vérifiés ${ago(last.at)} : ${plural(last.checked, 'produit', 'produits')}, ${last.applied} mis à jour, ${last.review} à revoir.`
                : 'Prix vérifiés chaque nuit à 2 h 20.'}
          </p>
        </>
      )}
    </section>
  );
};

// ── Ventes et achats ────────────────────────────────────────────────────────

export const SalesCard = ({
  orders,
  sandbox,
  loading,
}: {
  orders: MpDashOrders | null;
  sandbox: boolean;
  loading: boolean;
}) => {
  const sum = (k: 'sale' | 'purchase') =>
    orders ? orders.months.reduce((a, m) => a + m[k], 0) : 0;
  const marginSix = orders
    ? orders.months.reduce<number | null>(
        (a, m) => (m.margin == null ? a : (a ?? 0) + m.margin),
        null
      )
    : null;
  return (
    <section
      className="hx-card hx-s7"
      data-testid="hx-sales"
      aria-labelledby="hx-sales-title"
    >
      <div className="hx-card-head">
        <div>
          <h2 className="hx-card-title" id="hx-sales-title">
            Ventes et achats
          </h2>
          <p className="hx-card-note">
            Six derniers mois, hors taxes{sandbox ? ', chiffres d’essai' : ''}.
          </p>
        </div>
        <div className="hx-legend" style={{ margin: 0 }}>
          <span>
            <i style={{ background: SALE_INK }} />
            Ventes PEG
          </span>
          <span>
            <i style={{ background: PURCHASE_INK }} />
            Achats Master Print
          </span>
        </div>
      </div>
      {!orders ? (
        <p className="hx-muted">
          {loading ? 'Lecture…' : 'Chiffres indisponibles.'}
        </p>
      ) : monthsEmpty(orders.months) ? (
        <p className="hx-muted">
          Pas encore de commande chiffrée sur ces six mois.
        </p>
      ) : (
        <>
          <GroupedBars
            ariaLabel="Ventes et achats par mois"
            rows={orders.months.map((m) => ({
              key: m.month,
              axis: shortMonth(m, orders.months),
              title: m.label,
              values: [m.sale, m.purchase],
              note: `Marge ${fmtEur(m.margin)}, ${plural(m.orders, 'commande', 'commandes')}`,
            }))}
            series={SALES_SERIES}
            format={(n) => fmtEur(n)}
            axisFormat={compactEur}
          />
          <div className="hx-chart-foot">
            <p>
              Ventes<strong>{fmtEur(sum('sale'))}</strong>
            </p>
            <p>
              Achats<strong>{fmtEur(sum('purchase'))}</strong>
            </p>
            <p>
              Marge
              <strong
                style={{
                  color:
                    marginSix != null && marginSix < 0 ? '#fca5a5' : undefined,
                }}
              >
                {fmtEur(marginSix)}
              </strong>
            </p>
          </div>
          <details style={{ marginTop: 12 }}>
            <summary className="hx-link" style={{ fontSize: 12.5 }}>
              Détail par mois
            </summary>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: 8,
                fontSize: 12.5,
              }}
              data-testid="hx-months-table"
            >
              <thead>
                <tr style={{ color: MUTED, textAlign: 'right' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      fontWeight: 600,
                      padding: '6px 4px',
                    }}
                  >
                    Mois
                  </th>
                  <th style={{ fontWeight: 600, padding: '6px 4px' }}>
                    Ventes
                  </th>
                  <th style={{ fontWeight: 600, padding: '6px 4px' }}>
                    Achats
                  </th>
                  <th style={{ fontWeight: 600, padding: '6px 4px' }}>Marge</th>
                </tr>
              </thead>
              <tbody>
                {[...orders.months].reverse().map((x) => (
                  <tr
                    key={x.month}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <td style={{ textAlign: 'left', padding: '6px 4px' }}>
                      {x.label}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      {x.sale ? fmtEur(x.sale) : '—'}
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      {x.purchase ? fmtEur(x.purchase) : '—'}
                    </td>
                    <td style={{ padding: '6px 4px' }}>{fmtEur(x.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
};

// ── Compte Master Print ─────────────────────────────────────────────────────

export const AccountCard = ({
  status,
  hooks,
  subscribing,
  onSubscribe,
  onDetails,
  span = 'hx-s5',
}: {
  status: Extract<MpStatus, { configured: true }> | null;
  hooks: MpWebhooksOverview | null;
  subscribing: boolean;
  onSubscribe: () => void;
  onDetails?: () => void;
  span?: string;
}) => {
  const h = hooks && hooks.configured ? hooks : null;
  const live = new Set(status?.liveModules.map((m) => m.code) ?? []);
  return (
    <section
      className={`hx-card ${span}`}
      data-testid="hx-account"
      aria-labelledby="hx-account-title"
    >
      <div className="hx-card-head">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <h2 className="hx-card-title" id="hx-account-title">
            Compte Master Print
          </h2>
          {status?.priceTier && (
            <span className="hx-tier">{status.priceTier}</span>
          )}
        </div>
        {onDetails && (
          <button type="button" className="hx-link" onClick={onDetails}>
            Voir le suivi
          </button>
        )}
      </div>
      {!status ? (
        <p className="hx-muted">Compte illisible pour le moment.</p>
      ) : (
        <>
          <div className="hx-facts">
            <div className="hx-fact">
              <p>Client</p>
              <strong>{status.clientId}</strong>
            </div>
            <div className="hx-fact">
              <p>Paiement</p>
              <strong>{paymentModeLabel(status.paymentMode)}</strong>
            </div>
          </div>
          <div
            className={`hx-sync ${h?.subscribed ? 'hx-sync--on' : 'hx-sync--off'}`}
          >
            <div style={{ minWidth: 0 }}>
              <p
                className="hx-action-title"
                style={{ color: h?.subscribed ? '#86efac' : '#fcd34d' }}
              >
                {h?.subscribed
                  ? 'Suivi automatique branché'
                  : 'Suivi automatique non branché'}
              </p>
              <p className="hx-action-detail">
                {!h
                  ? 'État du suivi inconnu.'
                  : h.subscribed
                    ? h.received.lastAt
                      ? `Dernier avis reçu ${ago(h.received.lastAt)}, ${h.received.last7Days} sur 7 jours.`
                      : 'Aucun avis reçu pour l’instant.'
                    : 'Les commandes ne se mettent pas à jour toutes seules.'}
              </p>
            </div>
            {h && !h.subscribed && (
              <button
                type="button"
                className="hx-btn hx-btn--primary"
                onClick={onSubscribe}
                disabled={subscribing}
              >
                <TbPlugConnected aria-hidden="true" />
                {subscribing ? 'Abonnement…' : 'Abonner ce serveur'}
              </button>
            )}
          </div>
          <p className="hx-card-note" style={{ margin: '0 0 8px' }}>
            Familles de produits
            {live.size
              ? ' (en vert : ouvertes en vraies commandes)'
              : ', aucune encore ouverte en vraies commandes'}
          </p>
          <div className="hx-families">
            {status.modules.map((m) => (
              <span
                key={m.code}
                className={`hx-family${live.has(m.code) ? ' hx-family--live' : ''}`}
              >
                {live.has(m.code) && <TbCircleCheck aria-hidden="true" />}
                {m.label}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

// ── Dernières commandes ─────────────────────────────────────────────────────

const STAGE_OF: Record<string, string> = {
  awaiting_payment: 'payment',
  awaiting_files: 'files',
  awaiting_proof_approval: 'proof',
  files_received: 'production',
  in_production: 'production',
  ready_for_pickup: 'ready',
  shipped: 'shipped',
  delivered: 'delivered',
};

export const OrdersCard = ({
  orders,
  onOpenOrder,
  onOpenAll,
}: {
  orders: MpDashOrders;
  onOpenOrder: (orderId: string) => void;
  onOpenAll: () => void;
}) => (
  <section
    className="hx-card hx-s12"
    data-testid="hx-orders"
    aria-labelledby="hx-orders-title"
  >
    <div className="hx-card-head">
      <h2 className="hx-card-title" id="hx-orders-title">
        Dernières commandes
      </h2>
      <button type="button" className="hx-link" onClick={onOpenAll}>
        Toutes les commandes
      </button>
    </div>
    {!orders.recent.length ? (
      <p className="hx-muted">Aucune commande pour l’instant.</p>
    ) : (
      <ul className="hx-orders">
        {orders.recent.map((o) => {
          const alert = o.alerts[0];
          const ink =
            o.status === 'cancelled'
              ? 'rgba(255,255,255,0.25)'
              : STAGE_INK[STAGE_OF[o.status] ?? 'other'];
          return (
            <li
              key={o.orderId}
              className="hx-order"
              data-testid="hx-order"
              tabIndex={0}
              role="button"
              aria-label={`Ouvrir la commande ${o.orderId}`}
              onClick={() => onOpenOrder(o.orderId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenOrder(o.orderId);
                }
              }}
            >
              <span
                className="hx-order-dot"
                style={{ background: ink }}
                aria-hidden="true"
              />
              <span style={{ minWidth: 0 }}>
                <span className="hx-order-id">{o.orderId}</span>
                <span className="hx-order-status" style={{ display: 'block' }}>
                  {o.statusLabel}
                  {alert && (
                    <span
                      className="hx-order-alert"
                      style={{
                        background: tint(
                          alert.level === 'danger' ? '#f87171' : '#fbbf24',
                          0.16
                        ),
                        color: alert.level === 'danger' ? '#fca5a5' : '#fcd34d',
                      }}
                    >
                      {alert.label}
                    </span>
                  )}
                </span>
              </span>
              <span className="hx-order-project">
                {o.project ? (
                  <Link
                    to={projectPath(o.project.documentId)}
                    className="hx-link"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 13 }}
                  >
                    {o.project.name || 'Projet'}
                  </Link>
                ) : (
                  'Projet supprimé'
                )}
                {o.project?.customerName && (
                  <span style={{ color: MUTED }}>
                    , {o.project.customerName}
                  </span>
                )}
                {o.createdAt && (
                  <span style={{ color: MUTED }}>
                    , le {dayjs(o.createdAt).format('D MMM')}
                  </span>
                )}
              </span>
              <span className="hx-order-amount">
                {fmtEur(o.purchaseExclTax)}
              </span>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

// ── Chiffres clés en tête de chaque onglet ──────────────────────────────────

const Strip = ({ children }: { children: ReactNode }) => (
  <div className="hx-grid" style={{ marginBottom: 16 }} data-testid="hx-strip">
    {children}
  </div>
);

const RingFoot = ({
  text,
  n,
  total,
  color,
}: {
  text: string;
  n: number;
  total: number;
  color: string;
}) => (
  <>
    <span>{text}</span>
    <Ring
      value={ringValue(n, total)}
      color={color}
      size={36}
      stroke={4}
      label={`${n} sur ${total}`}
    />
  </>
);

/** Onglet Commandes. */
export const OrdersStrip = ({ orders }: { orders: MpDashOrders }) => {
  const count = (code: string) =>
    orders.stages.find((s) => s.code === code)?.count || 0;
  const danger = orders.todoOrders.some((o) =>
    o.alerts.some((a) => a.level === 'danger')
  );
  return (
    <Strip>
      <Kpi
        label="Vous attendent"
        icon={orders.todo ? <TbBellRinging /> : <TbCircleCheck />}
        accent={!orders.todo ? '#34d399' : danger ? '#f87171' : '#fbbf24'}
        value={String(orders.todo)}
        foot={
          <span>
            {orders.todo
              ? orders.todoOrders[0]?.alerts[0]?.label || 'Action attendue'
              : 'Rien en attente'}
          </span>
        }
      />
      <Kpi
        label="En fabrication"
        icon={<TbPrinter />}
        accent="#e0559f"
        value={String(count('production') + count('ready'))}
        foot={
          <span>
            {plural(
              count('files'),
              'attend ses fichiers',
              'attendent leurs fichiers'
            )}
          </span>
        }
      />
      <Kpi
        label="Expédiées ou livrées"
        icon={<TbTruckDelivery />}
        accent="#1f9cc6"
        value={String(count('shipped') + count('delivered'))}
        foot={<span>{plural(count('delivered'), 'livrée', 'livrées')}</span>}
      />
      <Kpi
        label="Achats ce mois"
        icon={<TbReceipt2 />}
        accent={PURCHASE_INK}
        value={fmtEur(orders.thisMonth.purchase)}
        foot={
          <>
            <span>
              {plural(orders.thisMonth.orders, 'commande', 'commandes')}
            </span>
            <Spark
              values={purchaseSeries(orders.months)}
              color={PURCHASE_INK}
            />
          </>
        }
      />
    </Strip>
  );
};

/** Onglet Catalogue. */
export const CatalogStrip = ({ catalog }: { catalog: MpDashCatalog }) => (
  <Strip>
    <Kpi
      label="Produits importés"
      icon={<TbPackage />}
      accent="#9d92ff"
      value={String(catalog.linked)}
      foot={<span>{plural(catalog.active, 'en vente', 'en vente')}</span>}
    />
    <Kpi
      label="Formulaire client"
      icon={<TbForms />}
      accent="#1f9cc6"
      value={String(catalog.withOffer)}
      foot={
        <RingFoot
          text={`sur ${catalog.linked}`}
          n={catalog.withOffer}
          total={catalog.linked}
          color="#1f9cc6"
        />
      }
    />
    <Kpi
      label="Avec photos"
      icon={<TbPhoto />}
      accent="#e0559f"
      value={String(catalog.withPhotos)}
      foot={
        <RingFoot
          text={`sur ${catalog.linked}`}
          n={catalog.withPhotos}
          total={catalog.linked}
          color="#e0559f"
        />
      }
    />
    <Kpi
      label="Prix suivis"
      icon={<TbRotateClockwise2 />}
      accent="#c98500"
      value={String(catalog.tracked)}
      foot={
        <RingFoot
          text={`sur ${catalog.linked}`}
          n={catalog.tracked}
          total={catalog.linked}
          color="#c98500"
        />
      }
    />
  </Strip>
);

/** Onglet Prix. */
export const PricesStrip = ({ prices }: { prices: MpPricesOverview }) => (
  <Strip>
    <Kpi
      label="Produits reliés"
      icon={<TbLink />}
      accent="#9d92ff"
      value={String(prices.linked)}
      foot={<span>à Master Print</span>}
    />
    <Kpi
      label="Suivis tout seuls"
      icon={<TbRotateClockwise2 />}
      accent="#34d399"
      value={String(prices.tracked)}
      foot={
        <RingFoot
          text={`sur ${prices.linked}`}
          n={prices.tracked}
          total={prices.linked}
          color="#34d399"
        />
      }
    />
    <Kpi
      label="À revoir"
      icon={<TbAlertTriangle />}
      accent={prices.pending ? '#fbbf24' : '#34d399'}
      value={String(prices.pending)}
      foot={
        <span>{prices.pending ? 'retouchés à la main' : 'rien à décider'}</span>
      }
    />
    <Kpi
      label="Dernière vérification"
      icon={<TbClockHour4 />}
      accent="#1f9cc6"
      value={
        prices.running ? 'En cours' : prices.last ? ago(prices.last.at) : '—'
      }
      foot={
        <span>
          {prices.last
            ? `${plural(prices.last.checked, 'produit relu', 'produits relus')}, chaque nuit à 2 h 20`
            : 'chaque nuit à 2 h 20'}
        </span>
      }
    />
  </Strip>
);

/** Onglet Photos. */
export const PhotosStrip = ({ catalog }: { catalog: MpDashCatalog }) => (
  <Strip>
    <Kpi
      label="Avec photos"
      icon={<TbPhoto />}
      accent="#e0559f"
      value={String(catalog.withPhotos)}
      foot={
        <RingFoot
          text={`sur ${catalog.linked} produits`}
          n={catalog.withPhotos}
          total={catalog.linked}
          color="#e0559f"
        />
      }
    />
    <Kpi
      label="Offres sans photo"
      icon={<TbPhotoOff />}
      accent={catalog.offersWithoutPhotosCount ? '#fbbf24' : '#34d399'}
      value={String(catalog.offersWithoutPhotosCount)}
      foot={
        <span>
          {catalog.offersWithoutPhotosCount
            ? 'fiche sans image côté client'
            : 'toutes illustrées'}
        </span>
      }
    />
    <Kpi
      label="Formulaires clients"
      icon={<TbForms />}
      accent="#1f9cc6"
      value={String(catalog.withOffer)}
      foot={<span>offres que le client commande seul</span>}
    />
    <Kpi
      label="Produits importés"
      icon={<TbPackage />}
      accent="#9d92ff"
      value={String(catalog.linked)}
      foot={<span>{plural(catalog.active, 'en vente', 'en vente')}</span>}
    />
  </Strip>
);
