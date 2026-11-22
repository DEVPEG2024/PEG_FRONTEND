/*
 * Tableau de bord Master Print (menu Fournisseurs, `/admin/master-print`) —
 * ajout 22/11/2026.
 *
 * Tout Master Print d'un coup d'œil : ce qu'il faut faire, où en sont les
 * commandes, achats / ventes / marge des six derniers mois, catalogue relié
 * (formulaires clients, photos, prix suivis) et état du compte. Cinq lectures en
 * parallèle, chacune peut tomber seule :
 *  - bilan        GET /master-print/admin/dashboard       (peg_strapi master-print-dashboard.service.ts)
 *  - compte       GET /master-print/admin/status          (/me chez Master Print)
 *  - service      GET /master-print/admin/service-status
 *  - suivi auto   GET /master-print/admin/webhooks
 *  - prix         GET /master-print/admin/prices
 * Règles pures : src/utils/masterPrintDashboard.ts. Admin seulement.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { HiRefresh } from 'react-icons/hi';
import type { MpStatus } from '@/@types/masterPrint';
import type {
  MpDashboard,
  MpDashCatalog,
  MpDashMonth,
  MpDashOrderRow,
  MpDashOrders,
  MpDashStage,
} from '@/@types/masterPrintDashboard';
import type { MpWebhooksOverview } from '@/@types/masterPrintOrders';
import type { MpPricesOverview } from '@/@types/masterPrintPrices';
import { apiGetMasterPrintDashboard } from '@/services/MasterPrintDashboardServices';
import {
  apiGetMasterPrintWebhooks,
  apiSubscribeMasterPrintWebhook,
} from '@/services/MasterPrintOrdersServices';
import { apiGetMasterPrintPrices } from '@/services/MasterPrintPricesServices';
import { apiGetMasterPrintStatus } from '@/services/MasterPrintServices';
import {
  apiGetMasterPrintServiceStatus,
  type MpServiceStatus,
} from '@/services/MasterPrintStatusServices';
import {
  fmtEur,
  isMasterPrintMissing,
  masterPrintError,
  statusTone,
  type Tone,
} from '@/utils/masterPrint';
import { ALERT_TONES } from '@/utils/masterPrintOrders';
import {
  CATALOG_PATH,
  type DashAction,
  ORDERS_PATH,
  ago,
  compactEur,
  dashboardActions,
  marginRate,
  monthsEmpty,
  niceTicks,
  paymentModeLabel,
  projectPath,
  share,
  shortMonth,
} from '@/utils/masterPrintDashboard';
import useResponsive from '@/utils/hooks/useResponsive';
import {
  Btn,
  LIVE_TONE,
  Pill,
  SANDBOX_TONE,
  card,
  label,
  muted,
  sectionTitle,
} from '@/views/app/common/projects/details/components/masterPrint/ui';

// ── Couleurs des graphiques (validées sur le fond des cartes, mode sombre) ──
const SALE = '#3987e5'; // ventes : bleu
const PURCHASE = '#d95926'; // achats : orange
const TRACK = 'rgba(57,135,229,0.16)'; // piste des jauges : même bleu, plus clair
const GRID = 'rgba(255,255,255,0.08)';
const AXIS = 'rgba(255,255,255,0.45)';
const OK_TONE: Tone = LIVE_TONE;
const INFO_TONE: Tone = {
  color: '#93c5fd',
  background: 'rgba(59,130,246,0.12)',
  border: 'rgba(59,130,246,0.35)',
};
const LEVEL_TONE: Record<DashAction['level'], Tone> = {
  danger: ALERT_TONES.danger,
  warning: ALERT_TONES.warning,
  info: INFO_TONE,
};
const LEVEL_ICON: Record<DashAction['level'], string> = {
  danger: '⛔',
  warning: '⚠️',
  info: 'ℹ️',
};

const linkStyle: CSSProperties = {
  color: '#8db4ff',
  textDecoration: 'underline',
};

const twoCols: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))',
  gap: '14px',
  alignItems: 'start',
};

type Slot<T> = { data: T | null; error: string | null; missing: boolean };
const emptySlot = <T,>(): Slot<T> => ({
  data: null,
  error: null,
  missing: false,
});

async function read<T>(
  call: () => Promise<{ data: T }>,
  fallback: string
): Promise<Slot<T>> {
  try {
    const { data } = await call();
    return { data, error: null, missing: false };
  } catch (e) {
    return {
      data: null,
      error: masterPrintError(e, fallback),
      missing: isMasterPrintMissing(e),
    };
  }
}

// ── Briques ─────────────────────────────────────────────────────────────────

const Section = ({
  title,
  right,
  children,
  testId,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  testId?: string;
}) => (
  <section style={{ ...card, minWidth: 0 }} data-testid={testId}>
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '4px 12px',
        marginBottom: '12px',
      }}
    >
      <h2 style={{ ...sectionTitle, margin: 0 }}>{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

const Kpi = ({
  title,
  value,
  sub,
  tone,
}: {
  title: string;
  value: string;
  sub?: ReactNode;
  tone?: Tone;
}) => (
  <div
    style={{
      ...card,
      padding: '14px 16px',
      minWidth: 0,
      ...(tone ? { border: `1.5px solid ${tone.border}` } : {}),
    }}
    data-testid="mp-dash-kpi"
  >
    <p style={label}>{title}</p>
    <p
      style={{
        fontSize: '26px',
        fontWeight: 700,
        margin: '2px 0 0',
        lineHeight: 1.15,
        color: tone ? tone.color : '#fff',
        overflowWrap: 'anywhere',
      }}
    >
      {value}
    </p>
    {sub && <p style={{ ...muted, marginTop: '4px' }}>{sub}</p>}
  </div>
);

const Unavailable = ({ slot, what }: { slot: Slot<unknown>; what: string }) => (
  <p style={muted}>
    {slot.missing
      ? `${what} : le serveur n’est pas encore à jour.`
      : `${what} indisponible${slot.error ? ` (${slot.error})` : ''}.`}
  </p>
);

// ── À faire ─────────────────────────────────────────────────────────────────

const Actions = ({
  actions,
  onSubscribe,
  subscribing,
}: {
  actions: DashAction[];
  onSubscribe: () => void;
  subscribing: boolean;
}) => {
  if (!actions.length)
    return (
      <p style={{ ...muted, color: OK_TONE.color }}>
        ✅ Rien à faire : tout est en ordre.
      </p>
    );
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {actions.map((a) => {
        const tone = LEVEL_TONE[a.level];
        return (
          <li
            key={a.key}
            data-testid="mp-dash-action"
            data-level={a.level}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px 12px',
              padding: '10px 12px',
              borderRadius: '12px',
              background: tone.background,
              border: `1px solid ${tone.border}`,
            }}
          >
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <p
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: tone.color,
                  margin: 0,
                }}
              >
                <span aria-hidden="true">{LEVEL_ICON[a.level]} </span>
                {a.title}
              </p>
              {a.detail && (
                <p
                  style={{
                    ...muted,
                    marginTop: '2px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {a.detail}
                </p>
              )}
            </div>
            {a.action === 'subscribe' ? (
              <Btn
                variant="primary"
                onClick={onSubscribe}
                disabled={subscribing}
              >
                {subscribing ? 'Abonnement…' : a.cta}
              </Btn>
            ) : a.to ? (
              <Link
                to={a.to}
                className="peg-tap-target"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: '36px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.06)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.cta || 'Ouvrir'} →
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

// ── Où en sont les commandes ────────────────────────────────────────────────

const Stages = ({ stages }: { stages: MpDashStage[] }) => {
  const pipeline = stages.filter(
    (s) => s.code !== 'cancelled' && (s.always || s.count > 0)
  );
  const cancelled = stages.find((s) => s.code === 'cancelled')?.count || 0;
  const max = Math.max(1, ...pipeline.map((s) => s.count));
  return (
    <div>
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {pipeline.map((s, i) => (
          <li
            key={s.code}
            data-testid="mp-dash-stage"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(110px, 38%) 1fr 32px',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
              <span style={{ color: AXIS, fontVariantNumeric: 'tabular-nums' }}>
                {i + 1}.{' '}
              </span>
              {s.label}
            </span>
            <span
              aria-hidden="true"
              style={{
                height: '10px',
                borderRadius: '5px',
                background: TRACK,
                overflow: 'hidden',
                display: 'block',
              }}
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${s.count ? Math.max(4, (s.count / max) * 100) : 0}%`,
                  background: SALE,
                  borderRadius: '5px',
                }}
              />
            </span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {s.count}
            </span>
          </li>
        ))}
      </ol>
      {cancelled > 0 && (
        <p style={{ ...muted, marginTop: '10px' }}>
          Et {cancelled} annulée{cancelled > 1 ? 's' : ''} (non facturée
          {cancelled > 1 ? 's' : ''}).
        </p>
      )}
    </div>
  );
};

// ── Achats, ventes, marge : six derniers mois ───────────────────────────────

const CHART_H = 170;

const MonthsChart = ({ months }: { months: MpDashMonth[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(0, ...months.flatMap((m) => [m.sale, m.purchase]));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const h = (v: number) => (v > 0 ? Math.max(2, (v / top) * CHART_H) : 0);
  const hovered = hover != null ? months[hover] : null;

  return (
    <div>
      {/* Légende : deux séries, toujours nommées */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 16px',
          marginBottom: '10px',
        }}
      >
        {[
          ['Ventes (prix des projets)', SALE],
          ['Achats Master Print', PURCHASE],
        ].map(([name, color]) => (
          <span
            key={name}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                background: color,
              }}
            />
            {name}
          </span>
        ))}
      </div>

      <div style={{ position: 'relative', paddingLeft: '52px' }}>
        {/* Graduations */}
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
                  left: '52px',
                  right: 0,
                  top: 0,
                  borderTop: `1px solid ${t === 0 ? 'rgba(255,255,255,0.18)' : GRID}`,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '-7px',
                  width: '46px',
                  textAlign: 'right',
                  fontSize: '10.5px',
                  lineHeight: '14px',
                  color: AXIS,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {compactEur(t)}
              </span>
            </div>
          ))}
        </div>

        {/* Colonnes */}
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
            if (e.pointerType === 'mouse') setHover(null);
          }}
        >
          {months.map((m, i) => (
            <div
              key={m.month}
              role="listitem"
              tabIndex={0}
              aria-label={`${m.label} : ventes ${fmtEur(m.sale)}, achats ${fmtEur(m.purchase)}, marge ${fmtEur(m.margin)}`}
              // Survol à la souris seulement ; au doigt, l'appui (clic) ouvre le mois touché.
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') setHover(i);
              }}
              onClick={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '2px',
                background:
                  hover === i ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderRadius: '6px',
                outline: 'none',
                cursor: 'default',
              }}
            >
              <span
                style={{
                  width: 'min(22px, 36%)',
                  height: h(m.sale),
                  background: SALE,
                  borderRadius: '4px 4px 0 0',
                }}
              />
              <span
                style={{
                  width: 'min(22px, 36%)',
                  height: h(m.purchase),
                  background: PURCHASE,
                  borderRadius: '4px 4px 0 0',
                }}
              />
            </div>
          ))}

          {hovered && hover != null && (
            <div
              role="status"
              style={{
                position: 'absolute',
                bottom: CHART_H + 6,
                left: `${Math.min(80, Math.max(20, ((hover + 0.5) / months.length) * 100))}%`,
                transform: 'translateX(-50%)',
                background: '#0b1626',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '10px',
                padding: '8px 10px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '4px' }}>
                {hovered.label}
              </strong>
              <span style={{ display: 'block' }}>
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: SALE,
                    marginRight: 6,
                  }}
                />
                Ventes {fmtEur(hovered.sale)}
              </span>
              <span style={{ display: 'block' }}>
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: PURCHASE,
                    marginRight: 6,
                  }}
                />
                Achats {fmtEur(hovered.purchase)}
              </span>
              <span
                style={{ display: 'block', color: 'rgba(255,255,255,0.7)' }}
              >
                Marge {fmtEur(hovered.margin)} · {hovered.orders} commande
                {hovered.orders > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Mois */}
        <div style={{ display: 'flex', marginTop: '6px' }}>
          {months.map((m) => (
            <span
              key={m.month}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '11px',
                color: AXIS,
              }}
            >
              {shortMonth(m, months)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const th: CSSProperties = {
  ...label,
  textAlign: 'right',
  padding: '6px 8px',
  whiteSpace: 'nowrap',
};
const td: CSSProperties = {
  textAlign: 'right',
  padding: '7px 8px',
  fontSize: '12.5px',
  fontVariantNumeric: 'tabular-nums',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  whiteSpace: 'nowrap',
};

/** Marge et son taux (le taux passe à la ligne sur téléphone). */
const MarginCell = ({
  m,
  compact,
}: {
  m: { sale: number; margin: number | null };
  compact: boolean;
}) => {
  if (m.margin == null) return <>—</>;
  const rate = marginRate(m);
  const pct = rate != null ? `${rate.toLocaleString('fr-FR')} %` : '';
  return compact ? (
    <>
      {fmtEur(m.margin)}
      {pct && (
        <span style={{ display: 'block', fontSize: '11px', color: AXIS }}>
          {pct}
        </span>
      )}
    </>
  ) : (
    <>{`${fmtEur(m.margin)}${pct ? ` (${pct})` : ''}`}</>
  );
};

/**
 * Vue tableau du graphique (mois récent en haut). Téléphone : sans la colonne
 * « Commandes » et sans les mois vides, pour tenir sans défiler de côté.
 */
const MonthsTable = ({
  months,
  totals,
  compact,
}: {
  months: MpDashMonth[];
  totals: MpDashOrders['totals'];
  compact: boolean;
}) => {
  const rows = [...months]
    .reverse()
    .filter((m) => !compact || m.orders || m.purchase || m.sale);
  const tdc: CSSProperties = compact
    ? { ...td, padding: '7px 4px', verticalAlign: 'top' }
    : td;
  const thc: CSSProperties = compact ? { ...th, padding: '6px 4px' } : th;
  const strong: CSSProperties = { ...tdc, fontWeight: 700 };
  return (
    <div style={{ overflowX: 'auto', marginTop: '14px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          minWidth: compact ? 0 : '420px',
        }}
        data-testid="mp-dash-months"
      >
        <thead>
          <tr>
            <th style={{ ...thc, textAlign: 'left' }}>Mois</th>
            {!compact && <th style={thc}>Commandes</th>}
            <th style={thc}>{compact ? 'Achats' : 'Achats HT'}</th>
            <th style={thc}>{compact ? 'Ventes' : 'Ventes HT'}</th>
            <th style={thc}>{compact ? 'Marge' : 'Marge HT'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.month}>
              <td style={{ ...tdc, textAlign: 'left' }}>{m.label}</td>
              {!compact && <td style={tdc}>{m.orders || '—'}</td>}
              <td style={tdc}>{m.purchase ? fmtEur(m.purchase) : '—'}</td>
              <td style={tdc}>{m.sale ? fmtEur(m.sale) : '—'}</td>
              <td
                style={{
                  ...tdc,
                  color:
                    m.margin != null && m.margin < 0
                      ? ALERT_TONES.danger.color
                      : undefined,
                }}
              >
                <MarginCell m={m} compact={compact} />
              </td>
            </tr>
          ))}
          <tr>
            <td
              style={{
                ...strong,
                textAlign: 'left',
                whiteSpace: compact ? 'normal' : 'nowrap',
              }}
            >
              Depuis le début
            </td>
            {!compact && <td style={strong}>{totals.orders || '—'}</td>}
            <td style={strong}>{fmtEur(totals.purchase)}</td>
            <td style={strong}>{fmtEur(totals.sale)}</td>
            <td
              style={{
                ...strong,
                color:
                  totals.margin != null && totals.margin < 0
                    ? ALERT_TONES.danger.color
                    : undefined,
              }}
            >
              <MarginCell m={totals} compact={compact} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ── Listes de commandes ─────────────────────────────────────────────────────

const OrderList = ({
  rows,
  empty,
}: {
  rows: MpDashOrderRow[];
  empty: string;
}) => {
  if (!rows.length) return <p style={muted}>{empty}</p>;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.map((o, i) => (
        <li
          key={o.orderId}
          data-testid="mp-dash-order"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px 12px',
            padding: '10px 0',
            borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}
        >
          <div style={{ minWidth: 0, flex: '1 1 200px' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <strong style={{ fontSize: '13px' }}>{o.orderId}</strong>
              <Pill tone={statusTone(o.status)}>{o.statusLabel}</Pill>
              {o.alerts.slice(0, 1).map((a) => (
                <Pill key={a.code} tone={ALERT_TONES[a.level]}>
                  {a.label}
                </Pill>
              ))}
            </div>
            <p style={{ ...muted, marginTop: '2px', overflowWrap: 'anywhere' }}>
              {o.project ? (
                <Link to={projectPath(o.project.documentId)} style={linkStyle}>
                  {o.project.name || 'Projet'}
                </Link>
              ) : (
                'Projet supprimé'
              )}
              {o.project?.customerName ? ` · ${o.project.customerName}` : ''}
              {o.createdAt ? ` · ${dayjs(o.createdAt).format('D MMM')}` : ''}
            </p>
          </div>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {fmtEur(o.purchaseExclTax)}
          </span>
        </li>
      ))}
    </ul>
  );
};

// ── Catalogue relié ─────────────────────────────────────────────────────────

const Meter = ({
  name,
  n,
  total,
  hint,
}: {
  name: string;
  n: number;
  total: number;
  hint?: string;
}) => (
  <li
    style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
    data-testid="mp-dash-meter"
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: '10px',
        fontSize: '13px',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.85)' }}>{name}</span>
      <span
        style={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {n} / {total}{' '}
        <span style={{ color: AXIS, fontWeight: 600 }}>
          · {share(n, total)} %
        </span>
      </span>
    </div>
    <span
      role="meter"
      aria-label={name}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={n}
      style={{
        height: '8px',
        borderRadius: '4px',
        background: TRACK,
        overflow: 'hidden',
        display: 'block',
      }}
    >
      <span
        style={{
          display: 'block',
          height: '100%',
          width: `${share(n, total)}%`,
          background: SALE,
          borderRadius: '4px',
        }}
      />
    </span>
    {hint && <span style={{ ...muted, fontSize: '11.5px' }}>{hint}</span>}
  </li>
);

const CatalogBlock = ({
  catalog,
  prices,
}: {
  catalog: MpDashCatalog;
  prices: MpPricesOverview | null;
}) => {
  if (!catalog.linked)
    return (
      <p style={muted}>
        Aucun produit Master Print importé dans PEG pour l’instant.{' '}
        <Link to={CATALOG_PATH} style={linkStyle}>
          Ouvrir le catalogue
        </Link>
      </p>
    );
  const last = prices?.last;
  return (
    <>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <Meter
          name="En vente (fiche active)"
          n={catalog.active}
          total={catalog.linked}
        />
        <Meter
          name="Avec formulaire client"
          n={catalog.withOffer}
          total={catalog.linked}
          hint="Le client choisit ses options et commande seul."
        />
        <Meter
          name="Avec photos"
          n={catalog.withPhotos}
          total={catalog.linked}
        />
        <Meter
          name="Prix suivis tout seuls"
          n={catalog.tracked}
          total={catalog.linked}
          hint="Les autres sont signalés « à revoir » quand Master Print change ses prix."
        />
      </ul>
      <p style={{ ...muted, marginTop: '12px' }}>
        {prices?.running
          ? 'Vérification des prix en cours…'
          : last
            ? `Dernière vérification des prix ${ago(last.at)} : ${last.checked} produit${last.checked > 1 ? 's' : ''}, ${last.applied} mis à jour, ${last.review} à revoir${last.error ? ` — ${last.error}` : ''}.`
            : 'Prix pas encore vérifiés (vérification chaque nuit à 2 h 20).'}
      </p>
    </>
  );
};

// ── Compte Master Print ─────────────────────────────────────────────────────

const Row = ({ name, children }: { name: string; children: ReactNode }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(120px, 40%) 1fr',
      gap: '10px',
      padding: '7px 0',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <span style={{ ...muted, fontSize: '12.5px' }}>{name}</span>
    <span style={{ fontSize: '13px', minWidth: 0, overflowWrap: 'anywhere' }}>
      {children}
    </span>
  </div>
);

const Chips = ({
  items,
  tone,
}: {
  items: Array<{ code: string; label: string }>;
  tone: Tone;
}) => (
  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
    {items.map((m) => (
      <Pill key={m.code} tone={tone}>
        {m.label}
      </Pill>
    ))}
  </span>
);

const AccountBlock = ({
  status,
  webhooks,
}: {
  status: Extract<MpStatus, { configured: true }>;
  webhooks: MpWebhooksOverview | null;
}) => {
  const hooks = webhooks && webhooks.configured ? webhooks : null;
  return (
    <div>
      <Row name="Entreprise">{status.company || '—'}</Row>
      <Row name="N° client">{status.clientId}</Row>
      <Row name="Niveau de prix">{status.priceTier || '—'}</Row>
      <Row name="Paiement">{paymentModeLabel(status.paymentMode)}</Row>
      <Row name="Familles accessibles">
        {status.modules.length ? (
          <Chips items={status.modules} tone={INFO_TONE} />
        ) : (
          '—'
        )}
      </Row>
      <Row name="Ouvertes en vraies commandes">
        {status.liveModules.length ? (
          <Chips items={status.liveModules} tone={OK_TONE} />
        ) : (
          <span style={muted}>Aucune pour l’instant</span>
        )}
      </Row>
      <Row name="Suivi automatique">
        {!hooks ? (
          '—'
        ) : hooks.subscribed ? (
          <>
            <span style={{ color: OK_TONE.color, fontWeight: 700 }}>
              ● Branché
            </span>
            <span style={{ ...muted, display: 'block' }}>
              {hooks.received.lastAt
                ? `Dernière notification ${ago(hooks.received.lastAt)} · ${hooks.received.last7Days} sur 7 jours`
                : 'Aucune notification reçue pour l’instant'}
            </span>
          </>
        ) : (
          <span style={{ color: ALERT_TONES.warning.color, fontWeight: 700 }}>
            ● Non branché
          </span>
        )}
      </Row>
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────

const MasterPrintDashboard = () => {
  const { smaller } = useResponsive();
  const phone = smaller.md;
  const [dash, setDash] = useState<Slot<MpDashboard>>(emptySlot);
  const [status, setStatus] = useState<Slot<MpStatus>>(emptySlot);
  const [service, setService] = useState<Slot<MpServiceStatus>>(emptySlot);
  const [hooks, setHooks] = useState<Slot<MpWebhooksOverview>>(emptySlot);
  const [prices, setPrices] = useState<Slot<MpPricesOverview>>(emptySlot);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    const [d, s, sv, w, p] = await Promise.all([
      read(apiGetMasterPrintDashboard, 'Bilan indisponible.'),
      read(apiGetMasterPrintStatus, 'Compte Master Print illisible.'),
      read(apiGetMasterPrintServiceStatus, 'État du service inconnu.'),
      read(apiGetMasterPrintWebhooks, 'Suivi automatique illisible.'),
      read(apiGetMasterPrintPrices, 'Prix illisibles.'),
    ]);
    if (id !== seq.current) return;
    setDash(d);
    setStatus(s);
    setService(sv);
    setHooks(w);
    setPrices(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const subscribe = async () => {
    setSubscribing(true);
    setNotice(null);
    try {
      const { data } = await apiSubscribeMasterPrintWebhook();
      setNotice({
        ok: true,
        text: `Suivi automatique branché sur ${data.url}.`,
      });
      setHooks(
        await read(apiGetMasterPrintWebhooks, 'Suivi automatique illisible.')
      );
    } catch (e) {
      setNotice({
        ok: false,
        text: masterPrintError(e, 'Abonnement impossible pour le moment.'),
      });
    } finally {
      setSubscribing(false);
    }
  };

  const d = dash.data && dash.data.configured ? dash.data : null;
  const st = status.data && status.data.configured ? status.data : null;
  const orders = d?.orders ?? null;
  const catalog = d?.catalog ?? null;
  const env = d?.environment ?? st?.environment ?? null;
  const sandbox = env === 'sandbox';
  const unconfigured =
    dash.data?.configured === false || status.data?.configured === false;
  const actions = dashboardActions({
    dashboard: dash.data,
    status: status.data,
    service: service.data,
    webhooks: hooks.data,
    prices: prices.data,
  });

  const svc = service.data;
  const serviceTone = !svc
    ? null
    : !svc.ok
      ? ALERT_TONES.danger
      : svc.degraded
        ? ALERT_TONES.warning
        : OK_TONE;
  const serviceText = !svc
    ? ''
    : !svc.ok
      ? 'Hors service'
      : svc.degraded
        ? 'Ralenti'
        : 'En ligne';

  const navBtn = (to: string, text: string) => (
    <Link
      to={to}
      className="peg-tap-target"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: '36px',
        padding: '8px 14px',
        borderRadius: '10px',
        fontSize: '12.5px',
        fontWeight: 700,
        color: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.05)',
        textDecoration: 'none',
      }}
    >
      {text}
    </Link>
  );

  const thisMonth = orders?.thisMonth;
  const rate = thisMonth ? marginRate(thisMonth) : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        fontFamily: 'Inter, sans-serif',
        color: '#fff',
        padding: phone ? '12px 0' : '4px 0 24px',
      }}
      data-testid="mp-dashboard"
    >
      {/* En-tête */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 10px',
            }}
          >
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
              Master Print
            </h1>
            {env && (
              <Pill tone={env === 'production' ? LIVE_TONE : SANDBOX_TONE}>
                {env === 'production' ? 'Production' : 'Essai'}
              </Pill>
            )}
            {serviceTone && (
              <Pill tone={serviceTone}>
                <span aria-hidden="true">●</span> {serviceText}
              </Pill>
            )}
          </div>
          <p style={{ ...muted, marginTop: '4px' }}>
            Tableau de bord{st?.company ? ` · ${st.company}` : ''}
            {d?.generatedAt
              ? ` · à jour à ${dayjs(d.generatedAt).format('HH:mm')}`
              : ''}
            . Montants hors taxes.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {navBtn(CATALOG_PATH, 'Catalogue')}
          {navBtn(ORDERS_PATH, 'Commandes')}
          <Btn onClick={load} disabled={loading}>
            <HiRefresh aria-hidden="true" />
            {loading ? 'Lecture…' : 'Actualiser'}
          </Btn>
        </div>
      </div>

      {unconfigured && (
        <div style={card}>
          <p style={muted}>
            Master Print n’est pas encore branché sur ce serveur
            (MASTER_PRINT_CLIENT_ID, MASTER_PRINT_API_KEY).
          </p>
        </div>
      )}

      {!unconfigured && (
        <>
          {/* Chiffres clés */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(min(${phone ? 140 : 200}px, 100%), 1fr))`,
              gap: '12px',
            }}
          >
            <Kpi
              title="Commandes en cours"
              value={orders ? String(orders.inProgress) : loading ? '…' : '—'}
              sub={
                orders
                  ? `${orders.counted} passée${orders.counted > 1 ? 's' : ''} par PEG au total`
                  : undefined
              }
            />
            <Kpi
              title="À traiter"
              value={orders ? String(orders.todo) : loading ? '…' : '—'}
              tone={
                !orders || !orders.todo
                  ? undefined
                  : orders.todoOrders.some((o) =>
                        o.alerts.some((a) => a.level === 'danger')
                      )
                    ? ALERT_TONES.danger
                    : ALERT_TONES.warning
              }
              sub={
                orders
                  ? orders.todo
                    ? 'Fichiers, BAT ou paiement attendus'
                    : 'Rien en attente'
                  : undefined
              }
            />
            <Kpi
              title="Achats du mois"
              value={
                thisMonth ? fmtEur(thisMonth.purchase) : loading ? '…' : '—'
              }
              sub={
                orders
                  ? `${sandbox ? 'Essai, rien n’est facturé · ' : ''}mois dernier : ${fmtEur(orders.lastMonth.purchase)}`
                  : undefined
              }
            />
            <Kpi
              title="Marge du mois"
              value={thisMonth ? fmtEur(thisMonth.margin) : loading ? '…' : '—'}
              tone={
                thisMonth && thisMonth.margin != null && thisMonth.margin < 0
                  ? ALERT_TONES.danger
                  : undefined
              }
              sub={
                thisMonth
                  ? thisMonth.margin == null
                    ? 'Aucun projet chiffré ce mois-ci'
                    : `${rate != null ? `${rate.toLocaleString('fr-FR')} % des ventes · ` : ''}${thisMonth.marginProjects} projet${thisMonth.marginProjects > 1 ? 's' : ''}`
                  : undefined
              }
            />
          </div>

          {/* À faire + étapes */}
          <div style={twoCols}>
            <Section title="À faire" testId="mp-dash-actions">
              {notice && (
                <p
                  style={{
                    ...muted,
                    marginBottom: '8px',
                    color: notice.ok ? OK_TONE.color : ALERT_TONES.danger.color,
                  }}
                >
                  {notice.text}
                </p>
              )}
              {loading && !dash.data ? (
                <p style={muted}>Lecture…</p>
              ) : (
                <Actions
                  actions={actions}
                  onSubscribe={subscribe}
                  subscribing={subscribing}
                />
              )}
            </Section>

            <Section
              title="Où en sont les commandes"
              right={
                <Link
                  to={ORDERS_PATH}
                  style={{ ...linkStyle, fontSize: '12.5px' }}
                >
                  Toutes les commandes
                </Link>
              }
              testId="mp-dash-stages"
            >
              {orders ? (
                orders.counted ? (
                  <Stages stages={orders.stages} />
                ) : (
                  <p style={muted}>
                    Aucune commande passée par PEG{' '}
                    {sandbox ? 'en essai' : 'en production'} pour l’instant.
                  </p>
                )
              ) : loading ? (
                <p style={muted}>Lecture…</p>
              ) : (
                <p style={muted}>
                  {dash.missing
                    ? 'Bilan : le serveur n’est pas encore à jour.'
                    : d?.ordersError || dash.error || 'Commandes illisibles.'}
                </p>
              )}
              {orders?.mpError && (
                <p
                  style={{
                    ...muted,
                    marginTop: '10px',
                    color: ALERT_TONES.warning.color,
                  }}
                >
                  Master Print injoignable ({orders.mpError}) : seules les
                  commandes enregistrées par PEG sont comptées.
                </p>
              )}
            </Section>
          </div>

          {/* Six derniers mois */}
          <Section
            title="Ventes, achats et marge — 6 derniers mois"
            testId="mp-dash-months-section"
          >
            {orders ? (
              <>
                {monthsEmpty(orders.months) ? (
                  <p style={muted}>
                    Pas encore de commande chiffrée sur ces six mois.
                  </p>
                ) : (
                  <MonthsChart months={orders.months} />
                )}
                <MonthsTable
                  months={orders.months}
                  totals={orders.totals}
                  compact={phone}
                />
                <p style={{ ...muted, marginTop: '10px', fontSize: '11.5px' }}>
                  Achats : commandes Master Print non annulées, au mois de la
                  commande. Ventes et marge : projets PEG, au mois de leur
                  première commande (prix du projet moins ses commandes Master
                  Print).
                  {sandbox
                    ? ' Clé de test : chiffres d’essai, rien n’est facturé.'
                    : ''}
                  {orders.excluded.outsidePeg
                    ? ` ${orders.excluded.outsidePeg} commande${orders.excluded.outsidePeg > 1 ? 's' : ''} hors PEG (autre serveur avec la même clé) non comptée${orders.excluded.outsidePeg > 1 ? 's' : ''}.`
                    : ''}
                  {orders.excluded.otherEnvironment
                    ? ` ${orders.excluded.otherEnvironment} commande${orders.excluded.otherEnvironment > 1 ? 's' : ''} de l’autre environnement non comptée${orders.excluded.otherEnvironment > 1 ? 's' : ''}.`
                    : ''}
                </p>
              </>
            ) : (
              <p style={muted}>
                {loading ? 'Lecture…' : 'Chiffres indisponibles.'}
              </p>
            )}
          </Section>

          {/* Commandes */}
          {orders && (
            <div style={twoCols}>
              <Section
                title={`À traiter (${orders.todo})`}
                right={
                  orders.todo > orders.todoOrders.length ? (
                    <Link
                      to={ORDERS_PATH}
                      style={{ ...linkStyle, fontSize: '12.5px' }}
                    >
                      Voir tout
                    </Link>
                  ) : undefined
                }
                testId="mp-dash-todo"
              >
                <OrderList
                  rows={orders.todoOrders}
                  empty="Aucune commande en attente de votre part."
                />
              </Section>
              <Section
                title="Dernières commandes"
                right={
                  <Link
                    to={ORDERS_PATH}
                    style={{ ...linkStyle, fontSize: '12.5px' }}
                  >
                    Toutes
                  </Link>
                }
                testId="mp-dash-recent"
              >
                <OrderList
                  rows={orders.recent}
                  empty="Aucune commande pour l’instant."
                />
              </Section>
            </div>
          )}

          {/* Catalogue + compte */}
          <div style={twoCols}>
            <Section
              title="Catalogue relié"
              right={
                <Link
                  to={CATALOG_PATH}
                  style={{ ...linkStyle, fontSize: '12.5px' }}
                >
                  Ouvrir le catalogue
                </Link>
              }
              testId="mp-dash-catalog"
            >
              {catalog ? (
                <CatalogBlock catalog={catalog} prices={prices.data} />
              ) : loading ? (
                <p style={muted}>Lecture…</p>
              ) : (
                <p style={muted}>
                  {d?.catalogError ||
                    (dash.missing
                      ? 'Bilan : le serveur n’est pas encore à jour.'
                      : dash.error) ||
                    'Catalogue illisible.'}
                </p>
              )}
            </Section>
            <Section title="Compte Master Print" testId="mp-dash-account">
              {st ? (
                <AccountBlock status={st} webhooks={hooks.data} />
              ) : loading ? (
                <p style={muted}>Lecture…</p>
              ) : (
                <Unavailable slot={status} what="Compte Master Print" />
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
};

export default MasterPrintDashboard;
