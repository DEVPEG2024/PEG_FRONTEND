/*
 * Widget « Chiffre d'affaires » de l'accueil admin (refonte du 22/11/2026,
 * demande : « 1000 fois mieux »). Composant d'AFFICHAGE : les montants mensuels
 * (24 mois) sont calculés par DashboardAdmin (protégé), comme le reste de
 * l'accueil. Règles : utils/revenueWidget.ts. Styles : design « hub » (hx-rev-*).
 *
 *  - période 6 ou 12 mois, comparée à la période précédente ; TTC ou HT
 *    (choix gardés sur l'appareil) ;
 *  - quatre chiffres : CA, marge brute, encaissé, dépenses, avec leur variation ;
 *  - courbes lissées (CA en aplat, marge et dépenses en traits), légende qui
 *    masque/affiche chaque courbe, repère vertical qui suit le mois le plus
 *    proche (souris, doigt, flèches du clavier), infobulle de tous les chiffres ;
 *  - repères : meilleur mois, moyenne mensuelle, taux de marge et d'encaissement ;
 *  - détail par mois en tableau.
 */
import { useId, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { niceScale } from '@/components/shared/hub/HubWidgets';
import {
  type RevKey,
  type RevMonth,
  type RevPeriod,
  axisLabel,
  bestMonth,
  deltaPct,
  longLabel,
  monotonePath,
  monthlyAverage,
  nearestIndex,
  periodView,
  ratePct,
  totals,
} from '@/utils/revenueWidget';

// Couleurs validées (daltonisme, contraste, toutes paires) sur le fond des cartes.
const INK: Record<'ca' | 'marge' | 'depenses', string> = {
  ca: '#7c6cf0',
  marge: '#199e70',
  depenses: '#d95926',
};
const SERIES: Array<{ key: 'ca' | 'marge' | 'depenses'; label: string }> = [
  { key: 'ca', label: 'Chiffre d’affaires' },
  { key: 'marge', label: 'Marge brute' },
  { key: 'depenses', label: 'Dépenses' },
];

const W = 1000;
const H = 230;
const PAD_X = 14;
const PAD_TOP = 14;

const PERIOD_KEY = 'peg:caWidgetPeriod';
const HT_KEY = 'peg:caWidgetHT';
const readPref = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writePref = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v);
  } catch {
    // Stockage indisponible : le choix vaut pour la session.
  }
};

type Props = {
  months: RevMonth[];
  /** Montant formaté (« ••• » quand l'admin masque les chiffres). */
  format: (n: number) => string;
  hidden: boolean;
  toHT: (n: number) => number;
};

const Delta = ({
  value,
  upIsGood,
  period,
  hasPrevious,
}: {
  value: number | null;
  upIsGood: boolean;
  period: RevPeriod;
  /** La période précédente est couverte par les données (même vide). */
  hasPrevious: boolean;
}) => {
  if (value == null)
    return (
      <span className="hx-rev-delta">
        {hasPrevious
          ? `rien sur les ${period} mois d’avant`
          : 'pas encore de période à comparer'}
      </span>
    );
  const good = value === 0 ? null : value > 0 === upIsGood;
  return (
    <span className="hx-rev-delta">
      <b className={good == null ? '' : good ? 'is-good' : 'is-bad'}>
        {value > 0 ? '↑ +' : value < 0 ? '↓ ' : ''}
        {value} %
      </b>{' '}
      vs les {period} mois d’avant
    </span>
  );
};

const RevenueWidget = ({ months, format, hidden, toHT }: Props) => {
  const gid = useId().replace(/:/g, '');
  const [period, setPeriod] = useState<RevPeriod>(() =>
    readPref(PERIOD_KEY) === '12' ? 12 : 6
  );
  const [ht, setHt] = useState<boolean>(() => readPref(HT_KEY) === '1');
  const [off, setOff] = useState<Partial<Record<RevKey, boolean>>>({});
  const [on, setOn] = useState<number | null>(null);

  const choosePeriod = (p: RevPeriod) => {
    setPeriod(p);
    setOn(null);
    writePref(PERIOD_KEY, String(p));
  };
  const chooseHt = (v: boolean) => {
    setHt(v);
    writePref(HT_KEY, v ? '1' : '0');
  };

  const conv = (m: RevMonth): RevMonth =>
    ht
      ? {
          key: m.key,
          ca: toHT(m.ca),
          marge: toHT(m.marge),
          paid: toHT(m.paid),
          depenses: toHT(m.depenses),
        }
      : m;
  const view = periodView(months, period);
  const cur = view.current.map(conv);
  const prev = view.previous ? view.previous.map(conv) : null;
  const t = totals(cur);
  const pt = prev ? totals(prev) : null;
  const n = cur.length;

  const hasSpend =
    cur.some((m) => m.depenses > 0) || !!prev?.some((m) => m.depenses > 0);
  const series = SERIES.filter((s) => s.key !== 'depenses' || hasSpend);
  const visible = series.filter((s) => !off[s.key]);
  const empty = !cur.some((m) => m.ca > 0 || m.marge > 0 || m.depenses > 0);

  // Échelle sur les courbes affichées.
  const ticks = niceScale(
    Math.max(0, ...cur.flatMap((m) => visible.map((s) => m[s.key])))
  );
  const top = ticks[ticks.length - 1] || 1;
  const x = (i: number) =>
    n > 1 ? PAD_X + (i * (W - PAD_X * 2)) / (n - 1) : W / 2;
  const y = (v: number) => PAD_TOP + (1 - v / top) * (H - PAD_TOP);
  const pts = (k: 'ca' | 'marge' | 'depenses'): Array<[number, number]> =>
    cur.map((m, i) => [x(i), y(m[k])]);
  const pct = (i: number) => `${(x(i) / W) * 100}%`;

  const best = bestMonth(cur);
  const avg = monthlyAverage(cur, 'ca');
  const marginRate = ratePct(t.marge, t.ca);
  const collectRate = ratePct(t.paid, t.ca);
  const last = n - 1;
  const hovered = on != null ? cur[on] : null;

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pad = (PAD_X / W) * r.width;
    setOn(
      nearestIndex(
        (e.clientX - r.left - pad) / Math.max(1, r.width - pad * 2),
        n
      )
    );
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setOn((cur0) => {
        const base = cur0 ?? last;
        return Math.max(
          0,
          Math.min(last, base + (e.key === 'ArrowLeft' ? -1 : 1))
        );
      });
    } else if (e.key === 'Escape') setOn(null);
  };

  const unit = ht ? 'HT' : 'TTC';

  return (
    <div className="hx-rev" data-testid="hx-revenue">
      {/* En-tête et réglages */}
      <div className="hx-card-head" style={{ marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <h3 className="hx-card-title">Chiffre d’affaires</h3>
          <p className="hx-card-note">
            {period} derniers mois, {unit}, comparés aux {period} mois d’avant.
          </p>
        </div>
        <div className="hx-rev-controls">
          <div className="hx-seg" role="group" aria-label="Période">
            {([6, 12] as RevPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => choosePeriod(p)}
              >
                {p} mois
              </button>
            ))}
          </div>
          <div className="hx-seg" role="group" aria-label="Montants">
            {[
              [false, 'TTC'],
              [true, 'HT'],
            ].map(([v, l]) => (
              <button
                key={String(l)}
                type="button"
                aria-pressed={ht === v}
                onClick={() => chooseHt(v as boolean)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quatre chiffres */}
      <div className="hx-rev-stats">
        <div className="hx-rev-stat hx-rev-stat--main">
          <p className="hx-rev-stat-label">
            <i style={{ background: INK.ca }} aria-hidden="true" />
            Chiffre d’affaires
          </p>
          <p className="hx-rev-stat-value">{format(t.ca)}</p>
          <Delta
            value={deltaPct(t.ca, pt?.ca)}
            upIsGood
            period={period}
            hasPrevious={!!pt}
          />
        </div>
        <div className="hx-rev-stat">
          <p className="hx-rev-stat-label">
            <i style={{ background: INK.marge }} aria-hidden="true" />
            Marge brute
          </p>
          <p className="hx-rev-stat-value">{format(t.marge)}</p>
          <Delta
            value={deltaPct(t.marge, pt?.marge)}
            upIsGood
            period={period}
            hasPrevious={!!pt}
          />
        </div>
        <div className="hx-rev-stat">
          <p className="hx-rev-stat-label">
            <i className="is-ring" aria-hidden="true" />
            Encaissé
          </p>
          <p className="hx-rev-stat-value">{format(t.paid)}</p>
          <Delta
            value={deltaPct(t.paid, pt?.paid)}
            upIsGood
            period={period}
            hasPrevious={!!pt}
          />
        </div>
        <div className="hx-rev-stat">
          <p className="hx-rev-stat-label">
            <i style={{ background: INK.depenses }} aria-hidden="true" />
            Dépenses
          </p>
          <p className="hx-rev-stat-value">{format(t.depenses)}</p>
          <Delta
            value={deltaPct(t.depenses, pt?.depenses)}
            upIsGood={false}
            period={period}
            hasPrevious={!!pt}
          />
        </div>
      </div>

      {/* Légende = interrupteurs */}
      <div
        className="hx-rev-legend"
        role="group"
        aria-label="Courbes affichées"
      >
        {series.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={!off[s.key]}
            onClick={() => setOff((o) => ({ ...o, [s.key]: !o[s.key] }))}
            disabled={!off[s.key] && visible.length === 1}
          >
            <i style={{ background: INK[s.key] }} aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Courbes */}
      {empty ? (
        <p className="hx-empty">Pas encore de chiffre sur ces {period} mois.</p>
      ) : (
        <div
          className="hx-rev-chart"
          style={{ '--h': `${H}px` } as CSSProperties}
        >
          {/* Graduations */}
          <div className="hx-rev-grid" aria-hidden="true">
            {ticks.map((tk) => (
              <div
                key={tk}
                style={{ bottom: `${(tk / top) * (H - PAD_TOP)}px` }}
              >
                <span>
                  {hidden
                    ? '•••'
                    : tk >= 1000
                      ? `${(tk / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`
                      : `${Math.round(tk)} €`}
                </span>
              </div>
            ))}
          </div>

          <div className="hx-rev-plot">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              width="100%"
              height={H}
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={`ca-${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={INK.ca} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={INK.ca} stopOpacity="0" />
                </linearGradient>
              </defs>
              {!off.ca && (
                <path
                  d={`${monotonePath(pts('ca'))} L${x(last)},${H} L${x(0)},${H} Z`}
                  fill={`url(#ca-${gid})`}
                />
              )}
              {visible.map((s) => (
                <path
                  key={s.key}
                  d={monotonePath(pts(s.key))}
                  fill="none"
                  stroke={INK[s.key]}
                  strokeWidth={s.key === 'ca' ? 2.5 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {/* Point final du CA, toujours visible */}
            {!off.ca && on == null && (
              <span
                className="hx-rev-dot"
                style={{
                  left: pct(last),
                  top: `${y(cur[last].ca)}px`,
                  background: INK.ca,
                }}
                aria-hidden="true"
              />
            )}

            {/* Repère et points du mois choisi */}
            {hovered && on != null && (
              <>
                <span
                  className="hx-rev-cross"
                  style={{ left: pct(on) }}
                  aria-hidden="true"
                />
                {visible.map((s) => (
                  <span
                    key={s.key}
                    className="hx-rev-dot"
                    style={{
                      left: pct(on),
                      top: `${y(hovered[s.key])}px`,
                      background: INK[s.key],
                    }}
                    aria-hidden="true"
                  />
                ))}
                <div
                  className="hx-tip hx-rev-tip"
                  role="status"
                  style={{
                    left: pct(on),
                    top: 6,
                    transform:
                      on > last / 2
                        ? 'translateX(calc(-100% - 14px))'
                        : 'translateX(14px)',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      marginBottom: 6,
                      textTransform: 'capitalize',
                    }}
                  >
                    {longLabel(hovered.key)}
                  </strong>
                  {series.map((s) => (
                    <span
                      key={s.key}
                      className="hx-rev-tip-row"
                      style={{ opacity: off[s.key] ? 0.45 : 1 }}
                    >
                      <i style={{ background: INK[s.key] }} />
                      <b>{format(hovered[s.key])}</b>
                      {s.label}
                    </span>
                  ))}
                  <span className="hx-rev-tip-row">
                    <i style={{ background: 'transparent' }} />
                    <b>{format(hovered.paid)}</b>
                    encaissé
                    {hovered.ca > 0
                      ? ` (${ratePct(hovered.paid, hovered.ca)} %)`
                      : ''}
                  </span>
                </div>
              </>
            )}

            {/* Zone de lecture : souris, doigt, clavier */}
            <div
              className="hx-rev-hit"
              tabIndex={0}
              role="slider"
              aria-label="Parcourir les mois (flèches gauche et droite)"
              aria-valuemin={0}
              aria-valuemax={last}
              aria-valuenow={on ?? last}
              aria-valuetext={
                hovered
                  ? `${longLabel(hovered.key)} : chiffre d’affaires ${format(hovered.ca)}, marge ${format(hovered.marge)}, dépenses ${format(hovered.depenses)}, encaissé ${format(hovered.paid)}`
                  : `${longLabel(cur[last].key)} : chiffre d’affaires ${format(cur[last].ca)}`
              }
              onPointerMove={(e) => {
                if (e.pointerType === 'mouse') pick(e);
              }}
              onPointerDown={(e) => {
                if (e.pointerType !== 'mouse') pick(e);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === 'mouse') setOn(null);
              }}
              onKeyDown={onKey}
              onFocus={() => setOn((c) => c ?? last)}
              onBlur={() => setOn(null)}
            />
          </div>

          {/* Mois */}
          <div className="hx-rev-x" aria-hidden="true">
            {cur.map((m, i) => (
              <span
                key={m.key}
                data-odd={i % 2 === 1 && n > 6}
                data-on={on === i}
                style={{ left: pct(i) }}
              >
                {axisLabel(m.key, i)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Repères */}
      <div className="hx-rev-insights">
        <div>
          <p>Meilleur mois</p>
          <strong>
            {best ? (
              <span style={{ textTransform: 'capitalize' }}>
                {longLabel(best.key)}
              </span>
            ) : (
              '—'
            )}
          </strong>
          <span>{best ? format(best.ca) : 'aucun chiffre'}</span>
        </div>
        <div>
          <p>Moyenne mensuelle</p>
          <strong>{format(avg)}</strong>
          <span>de chiffre d’affaires</span>
        </div>
        <div>
          <p>Taux de marge</p>
          <strong>{marginRate == null ? '—' : `${marginRate} %`}</strong>
          <span>du chiffre d’affaires</span>
        </div>
        <div>
          <p>Taux d’encaissement</p>
          <strong>{collectRate == null ? '—' : `${collectRate} %`}</strong>
          <span>déjà encaissé</span>
        </div>
      </div>

      {/* Tableau */}
      <details className="hx-rev-table">
        <summary className="hx-link">Détail par mois</summary>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Mois</th>
                <th>CA</th>
                <th>Marge</th>
                <th>Encaissé</th>
                <th>Dépenses</th>
              </tr>
            </thead>
            <tbody>
              {[...cur].reverse().map((m) => (
                <tr key={m.key}>
                  <td style={{ textTransform: 'capitalize' }}>
                    {longLabel(m.key)}
                  </td>
                  <td>{m.ca ? format(m.ca) : '—'}</td>
                  <td>{m.marge ? format(m.marge) : '—'}</td>
                  <td>{m.paid ? format(m.paid) : '—'}</td>
                  <td>{m.depenses ? format(m.depenses) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

export default RevenueWidget;
