/*
 * Page Master Print — widgets de la vue d'ensemble et de l'onglet « Compte et
 * suivi ». Styles : hubStyles.ts (préfixe mpx-). Règles : utils/masterPrintHub.ts
 * et utils/masterPrintDashboard.ts.
 */
import { useState } from 'react';
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
  TbInfoCircle,
  TbPlugConnected,
  TbPrinter,
  TbReceipt2,
} from 'react-icons/tb';
import type { MpStatus } from '@/@types/masterPrint';
import type {
  MpDashCatalog,
  MpDashMonth,
  MpDashOrders,
} from '@/@types/masterPrintDashboard';
import type { MpWebhooksOverview } from '@/@types/masterPrintOrders';
import type { MpPricesOverview } from '@/@types/masterPrintPrices';
import { fmtEur } from '@/utils/masterPrint';
import {
  type DashAction,
  ago,
  compactEur,
  marginRate,
  monthsEmpty,
  niceTicks,
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
  sparkPoints,
  stations,
} from '@/utils/masterPrintHub';

// Couleurs des séries (validées sur le fond des cartes, mode sombre).
export const SALE_INK = '#7c6cf0';
export const PURCHASE_INK = '#d95926';
const MUTED = 'rgba(226,232,255,0.45)';

const tint = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n > 1 ? many : one}`;

// ── Motifs d'imprimerie ─────────────────────────────────────────────────────

/** Barre de contrôle couleur : cyan, magenta, jaune, noir (blanc sur fond sombre). */
export const ColorBar = () => (
  <span className="mpx-colorbar" aria-hidden="true">
    <span style={{ background: '#1f9cc6' }} />
    <span style={{ background: '#e0559f' }} />
    <span style={{ background: '#c98500' }} />
    <span style={{ background: '#e8ecf8' }} />
  </span>
);

/** Repère de calage. */
const RegMark = () => (
  <svg
    className="mpx-regmark"
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

// ── Petits graphiques ───────────────────────────────────────────────────────

/** Anneau : une part d'un tout (fond = même teinte, plus claire). */
export const Ring = ({
  value,
  color,
  size = 52,
  stroke = 6,
  label,
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
  label?: string;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? `${value} %`}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tint(color, 0.18)}
        strokeWidth={stroke}
      />
      {value > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="#fff"
        fontSize={size * (value >= 100 ? 0.21 : 0.25)}
        fontWeight={800}
        fontFamily="Inter, sans-serif"
      >
        {value}%
      </text>
    </svg>
  );
};

/** Courbe des six derniers mois (point final sur le mois en cours). */
const Spark = ({ values, color }: { values: number[]; color: string }) => {
  const w = 84;
  const h = 30;
  const pts = sparkPoints(values, w, h);
  if (pts.length < 2) return null;
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      className="mpx-spark"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <polygon
        points={`${pts[0][0]},${h} ${line} ${lx},${h}`}
        fill={tint(color, 0.12)}
      />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={lx}
        cy={ly}
        r="4"
        fill={color}
        stroke="#131e34"
        strokeWidth="2"
      />
    </svg>
  );
};

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
      className="mpx-card mpx-hero mpx-s12"
      data-testid="mpx-atelier"
      aria-labelledby="mpx-atelier-title"
    >
      <RegMark />
      <h2 className="mpx-hero-title" id="mpx-atelier-title">
        Votre atelier
      </h2>
      <p className="mpx-hero-lead">
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
            className="mpx-line"
            style={{ '--n': line.stations.length } as CSSProperties}
            role="list"
            aria-label="Étapes de fabrication"
          >
            <span
              className="mpx-track"
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
                className="mpx-station"
                data-testid="mpx-station"
                style={{ '--ink': s.ink } as CSSProperties}
              >
                <span
                  className={`mpx-node${s.count ? '' : ' mpx-node--empty'}${s.waitingOnYou ? ' mpx-node--wait' : ''}`}
                >
                  {s.count}
                </span>
                <span className="mpx-station-text">
                  <span className="mpx-station-label">{s.label}</span>
                  {s.waitingOnYou && (
                    <span
                      className="mpx-station-note"
                      style={{
                        color: s.ink === STAGE_INK.files ? '#f2c14e' : '#fff',
                      }}
                    >
                      À vous de jouer
                    </span>
                  )}
                  {(s.orders.length > 0 || s.more > 0) && (
                    <span className="mpx-chips">
                      {s.orders.map((o) => (
                        <button
                          key={o.orderId}
                          type="button"
                          className={`mpx-chip${o.danger ? ' mpx-chip--danger' : ''}`}
                          onClick={() => onOpenOrder(o.orderId)}
                          title={`Ouvrir la commande ${o.orderId}`}
                        >
                          {o.short}
                        </button>
                      ))}
                      {s.more > 0 && (
                        <span className="mpx-chip mpx-chip--more">
                          +{s.more}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="mpx-hero-foot">
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

export const Kpi = ({
  label,
  icon,
  accent,
  value,
  foot,
  onClick,
  testId = 'mpx-kpi',
}: {
  label: string;
  icon: ReactNode;
  accent: string;
  value: string;
  foot?: ReactNode;
  onClick?: () => void;
  testId?: string;
}) => {
  const body = (
    <>
      <span className="mpx-kpi-top">
        <span className="mpx-kpi-label">{label}</span>
        <span
          className="mpx-kpi-icon"
          style={{ background: tint(accent, 0.14), color: accent }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </span>
      <span className="mpx-kpi-value">{value}</span>
      <span className="mpx-kpi-foot">{foot}</span>
    </>
  );
  return onClick ? (
    <button
      type="button"
      className="mpx-card mpx-kpi mpx-kpi--link mpx-s3"
      onClick={onClick}
      data-testid={testId}
    >
      {body}
    </button>
  ) : (
    <div className="mpx-card mpx-kpi mpx-s3" data-testid={testId}>
      {body}
    </div>
  );
};

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
        testId="mpx-kpi-todo"
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
                  <span className="mpx-delta">
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
    className="mpx-card mpx-s7"
    data-testid="mpx-actions"
    aria-labelledby="mpx-actions-title"
  >
    <div className="mpx-card-head">
      <div>
        <h2 className="mpx-card-title" id="mpx-actions-title">
          À faire
        </h2>
        <p className="mpx-card-note">Le plus important d’abord.</p>
      </div>
    </div>
    {notice && (
      <p
        className="mpx-muted"
        style={{ marginBottom: 10, color: notice.ok ? '#86efac' : '#fca5a5' }}
        role="status"
      >
        {notice.text}
      </p>
    )}
    {loading && !actions.length ? (
      <p className="mpx-muted">Lecture…</p>
    ) : !actions.length ? (
      <div className="mpx-allgood">
        <TbCircleCheck size={26} color="#34d399" aria-hidden="true" />
        <div>
          <p className="mpx-action-title">Tout est en ordre</p>
          <p className="mpx-action-detail">
            Aucune commande, aucun prix ni aucune fiche n’attend votre
            intervention.
          </p>
        </div>
      </div>
    ) : (
      <ul className="mpx-actions">
        {actions.map((a) => {
          const look = LEVEL_LOOK[a.level];
          return (
            <li
              key={a.key}
              className="mpx-action"
              data-testid="mpx-action"
              data-level={a.level}
            >
              <span
                className="mpx-action-icon"
                style={{
                  background: tint(look.color, 0.14),
                  color: look.color,
                }}
                aria-hidden="true"
              >
                {look.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <p className="mpx-action-title">{a.title}</p>
                {a.detail && <p className="mpx-action-detail">{a.detail}</p>}
              </div>
              {a.action === 'subscribe' ? (
                <button
                  type="button"
                  className="mpx-btn mpx-btn--primary mpx-action-cta"
                  onClick={onSubscribe}
                  disabled={subscribing}
                >
                  <TbPlugConnected aria-hidden="true" />
                  {subscribing ? 'Abonnement…' : a.cta}
                </button>
              ) : a.to ? (
                <Link
                  to={a.to}
                  className="mpx-btn mpx-btn--ghost mpx-action-cta"
                >
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
      className="mpx-card mpx-s5"
      data-testid="mpx-catalog"
      aria-labelledby="mpx-catalog-title"
    >
      <div className="mpx-card-head">
        <div>
          <h2 className="mpx-card-title" id="mpx-catalog-title">
            Catalogue relié
          </h2>
          {catalog && (
            <p className="mpx-card-note">
              {plural(catalog.linked, 'produit importé', 'produits importés')}{' '}
              dans PEG
            </p>
          )}
        </div>
        <button type="button" className="mpx-link" onClick={onOpen}>
          Ouvrir le catalogue
        </button>
      </div>
      {!catalog ? (
        <p className="mpx-muted">
          {loading
            ? 'Lecture…'
            : problem || 'Catalogue illisible pour le moment.'}
        </p>
      ) : !catalog.linked ? (
        <p className="mpx-muted">
          Aucun produit importé pour l’instant : cherchez-en dans le catalogue
          et importez-les dans PEG.
        </p>
      ) : (
        <>
          <div className="mpx-rings">
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
              <div key={r.name} className="mpx-ring" data-testid="mpx-ring">
                <Ring
                  value={ringValue(r.n, catalog.linked)}
                  color={r.color}
                  label={`${r.name} : ${r.n} sur ${catalog.linked}`}
                />
                <div className="mpx-ring-text">
                  <p className="mpx-ring-name">{r.name}</p>
                  <p className="mpx-ring-sub">
                    {r.n} sur {catalog.linked}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {catalog.withoutOffer.length > 0 && (
            <ul
              className="mpx-todo-list"
              aria-label="Produits sans formulaire client"
            >
              {catalog.withoutOffer.slice(0, 3).map((p) => (
                <li key={p.documentId}>
                  <span>{p.name}</span>
                  <Link to={offerPath(p.documentId)} className="mpx-link">
                    Régler le formulaire
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mpx-muted" style={{ marginTop: 14, fontSize: 12.5 }}>
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

const CHART_H = 168;

const MonthBars = ({ months }: { months: MpDashMonth[] }) => {
  const [on, setOn] = useState<number | null>(null);
  const ticks = niceTicks(
    Math.max(0, ...months.flatMap((m) => [m.sale, m.purchase]))
  );
  const top = ticks[ticks.length - 1] || 1;
  const h = (v: number) => (v > 0 ? Math.max(3, (v / top) * CHART_H) : 0);
  const m = on != null ? months[on] : null;
  return (
    <div className="mpx-chart">
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: CHART_H,
        }}
      >
        {ticks.map((t) => (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: (t / top) * CHART_H,
              height: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 52,
                right: 0,
                top: 0,
                borderTop: `1px solid ${t === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)'}`,
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: -7,
                width: 44,
                textAlign: 'right',
                fontSize: 10.5,
                lineHeight: '14px',
                color: MUTED,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {compactEur(t)}
            </span>
          </div>
        ))}
      </div>
      <div
        role="list"
        aria-label="Ventes et achats par mois"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          height: CHART_H,
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setOn(null);
        }}
      >
        {months.map((x, i) => (
          <div
            key={x.month}
            role="listitem"
            tabIndex={0}
            className="mpx-col"
            data-on={on === i}
            aria-label={`${x.label} : ventes ${fmtEur(x.sale)}, achats ${fmtEur(x.purchase)}, marge ${fmtEur(x.margin)}`}
            // Survol à la souris seulement ; au doigt, l'appui (clic) ouvre le mois touché.
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') setOn(i);
            }}
            onClick={() => setOn(i)}
            onFocus={() => setOn(i)}
            onBlur={() => setOn(null)}
          >
            <span
              className="mpx-bar"
              style={{ height: h(x.sale), background: SALE_INK }}
            />
            <span
              className="mpx-bar"
              style={{ height: h(x.purchase), background: PURCHASE_INK }}
            />
          </div>
        ))}
        {m && on != null && (
          <div
            className="mpx-tip"
            role="status"
            style={{
              bottom: CHART_H + 8,
              left: `${Math.min(78, Math.max(22, ((on + 0.5) / months.length) * 100))}%`,
            }}
          >
            <strong style={{ display: 'block', marginBottom: 4 }}>
              {m.label}
            </strong>
            <span style={{ display: 'block' }}>
              <i style={{ background: SALE_INK }} />
              Ventes {fmtEur(m.sale)}
            </span>
            <span style={{ display: 'block' }}>
              <i style={{ background: PURCHASE_INK }} />
              Achats {fmtEur(m.purchase)}
            </span>
            <span style={{ display: 'block', color: 'rgba(226,232,255,0.7)' }}>
              Marge {fmtEur(m.margin)},{' '}
              {plural(m.orders, 'commande', 'commandes')}
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', marginTop: 8 }}>
        {months.map((x) => (
          <span
            key={x.month}
            style={{ flex: 1, textAlign: 'center', fontSize: 11, color: MUTED }}
          >
            {shortMonth(x, months)}
          </span>
        ))}
      </div>
    </div>
  );
};

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
      className="mpx-card mpx-s7"
      data-testid="mpx-sales"
      aria-labelledby="mpx-sales-title"
    >
      <div className="mpx-card-head">
        <div>
          <h2 className="mpx-card-title" id="mpx-sales-title">
            Ventes et achats
          </h2>
          <p className="mpx-card-note">
            Six derniers mois, hors taxes{sandbox ? ', chiffres d’essai' : ''}.
          </p>
        </div>
        <div className="mpx-legend" style={{ margin: 0 }}>
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
        <p className="mpx-muted">
          {loading ? 'Lecture…' : 'Chiffres indisponibles.'}
        </p>
      ) : monthsEmpty(orders.months) ? (
        <p className="mpx-muted">
          Pas encore de commande chiffrée sur ces six mois.
        </p>
      ) : (
        <>
          <MonthBars months={orders.months} />
          <div className="mpx-chart-foot">
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
            <summary className="mpx-link" style={{ fontSize: 12.5 }}>
              Détail par mois
            </summary>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: 8,
                fontSize: 12.5,
              }}
              data-testid="mpx-months-table"
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
  span = 'mpx-s5',
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
      className={`mpx-card ${span}`}
      data-testid="mpx-account"
      aria-labelledby="mpx-account-title"
    >
      <div className="mpx-card-head">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <h2 className="mpx-card-title" id="mpx-account-title">
            Compte Master Print
          </h2>
          {status?.priceTier && (
            <span className="mpx-tier">{status.priceTier}</span>
          )}
        </div>
        {onDetails && (
          <button type="button" className="mpx-link" onClick={onDetails}>
            Voir le suivi
          </button>
        )}
      </div>
      {!status ? (
        <p className="mpx-muted">Compte illisible pour le moment.</p>
      ) : (
        <>
          <div className="mpx-facts">
            <div className="mpx-fact">
              <p>Client</p>
              <strong>{status.clientId}</strong>
            </div>
            <div className="mpx-fact">
              <p>Paiement</p>
              <strong>{paymentModeLabel(status.paymentMode)}</strong>
            </div>
          </div>
          <div
            className={`mpx-sync ${h?.subscribed ? 'mpx-sync--on' : 'mpx-sync--off'}`}
          >
            <div style={{ minWidth: 0 }}>
              <p
                className="mpx-action-title"
                style={{ color: h?.subscribed ? '#86efac' : '#fcd34d' }}
              >
                {h?.subscribed
                  ? 'Suivi automatique branché'
                  : 'Suivi automatique non branché'}
              </p>
              <p className="mpx-action-detail">
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
                className="mpx-btn mpx-btn--primary"
                onClick={onSubscribe}
                disabled={subscribing}
              >
                <TbPlugConnected aria-hidden="true" />
                {subscribing ? 'Abonnement…' : 'Abonner ce serveur'}
              </button>
            )}
          </div>
          <p className="mpx-card-note" style={{ margin: '0 0 8px' }}>
            Familles de produits
            {live.size
              ? ' (en vert : ouvertes en vraies commandes)'
              : ', aucune encore ouverte en vraies commandes'}
          </p>
          <div className="mpx-families">
            {status.modules.map((m) => (
              <span
                key={m.code}
                className={`mpx-family${live.has(m.code) ? ' mpx-family--live' : ''}`}
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
    className="mpx-card mpx-s12"
    data-testid="mpx-orders"
    aria-labelledby="mpx-orders-title"
  >
    <div className="mpx-card-head">
      <h2 className="mpx-card-title" id="mpx-orders-title">
        Dernières commandes
      </h2>
      <button type="button" className="mpx-link" onClick={onOpenAll}>
        Toutes les commandes
      </button>
    </div>
    {!orders.recent.length ? (
      <p className="mpx-muted">Aucune commande pour l’instant.</p>
    ) : (
      <ul className="mpx-orders">
        {orders.recent.map((o) => {
          const alert = o.alerts[0];
          const ink =
            o.status === 'cancelled'
              ? 'rgba(255,255,255,0.25)'
              : STAGE_INK[STAGE_OF[o.status] ?? 'other'];
          return (
            <li
              key={o.orderId}
              className="mpx-order"
              data-testid="mpx-order"
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
                className="mpx-order-dot"
                style={{ background: ink }}
                aria-hidden="true"
              />
              <span style={{ minWidth: 0 }}>
                <span className="mpx-order-id">{o.orderId}</span>
                <span className="mpx-order-status" style={{ display: 'block' }}>
                  {o.statusLabel}
                  {alert && (
                    <span
                      className="mpx-order-alert"
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
              <span className="mpx-order-project">
                {o.project ? (
                  <Link
                    to={projectPath(o.project.documentId)}
                    className="mpx-link"
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
              <span className="mpx-order-amount">
                {fmtEur(o.purchaseExclTax)}
              </span>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
