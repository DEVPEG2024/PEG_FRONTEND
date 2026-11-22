/*
 * Design « hub » commun (22/11/2026) — widgets partagés par la page Master Print
 * et l'accueil admin PEG. Styles : hubStyles.ts (préfixe hx-).
 *
 * Graphiques : couleurs des séries validées (daltonisme, contraste) sur le fond
 * des cartes en mode sombre ; une légende dès deux séries ; survol à la souris,
 * appui au doigt (jamais de survol simulé au toucher) ; vue tableau à côté.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';

const MUTED = 'rgba(226,232,255,0.45)';

/** Couleur #rrggbb → rgba avec transparence. */
export const tint = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Graduations « rondes » d'un axe qui part de 0 (1, 2 ou 5 × 10^n). */
export function niceScale(max: number, intervals = 4): number[] {
  if (!(max > 0)) return [0];
  const raw = max / intervals;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10]
    .map((k) => k * pow)
    .find((s) => s >= raw) as number;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step)
    out.push(Math.round(v * 100) / 100);
  return out;
}

// ── Carte ───────────────────────────────────────────────────────────────────

export const Card = ({
  title,
  note,
  right,
  children,
  className = 'hx-s12',
  testId,
  id,
}: {
  title: ReactNode;
  note?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
  id?: string;
}) => (
  <section
    className={`hx-card ${className}`}
    data-testid={testId}
    aria-labelledby={id}
  >
    <div className="hx-card-head">
      <div style={{ minWidth: 0 }}>
        <h2 className="hx-card-title" id={id}>
          {title}
        </h2>
        {note && <p className="hx-card-note">{note}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

// ── Anneau, courbe ──────────────────────────────────────────────────────────

/** Anneau : une part d'un tout (fond = même teinte, plus claire). */
export const Ring = ({
  value,
  color,
  size = 52,
  stroke = 6,
  label,
  text,
}: {
  value: number;
  color: string;
  size?: number;
  stroke?: number;
  label?: string;
  /** Texte au centre (par défaut « value % »). */
  text?: string;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const t = text ?? `${Math.round(value)}%`;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label ?? t}
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
      {v > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill="#fff"
        fontSize={size * (t.length >= 4 ? 0.21 : 0.25)}
        fontWeight={800}
        fontFamily="Inter, sans-serif"
      >
        {t}
      </text>
    </svg>
  );
};

/** Points d'une courbe (x de pad à w − pad, y de h − pad à pad) ; à plat au milieu si tout vaut 0. */
export function sparkline(
  values: number[],
  w: number,
  h: number,
  pad = 4
): Array<[number, number]> {
  if (!values.length) return [];
  const max = Math.max(...values);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  return values.map((v, i) => [
    Math.round((pad + i * step) * 10) / 10,
    Math.round((max > 0 ? h - pad - (v / max) * (h - pad * 2) : h / 2) * 10) /
      10,
  ]);
}

/** Petite courbe (point final = la valeur la plus récente). */
export const Spark = ({
  values,
  color,
  w = 84,
  h = 30,
  className = 'hx-spark',
  stretch = false,
}: {
  values: number[];
  color: string;
  w?: number;
  h?: number;
  className?: string;
  /** Occupe toute la largeur de son parent (fond de carte). */
  stretch?: boolean;
}) => {
  const pts = sparkline(values, w, h);
  if (pts.length < 2) return null;
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg
      className={className}
      width={stretch ? '100%' : w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio={stretch ? 'none' : undefined}
      aria-hidden="true"
    >
      <polygon
        points={`${pts[0][0]},${h} ${line} ${lx},${h}`}
        fill={tint(color, stretch ? 0.1 : 0.12)}
      />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {!stretch && (
        <circle
          cx={lx}
          cy={ly}
          r="4"
          fill={color}
          stroke="#131e34"
          strokeWidth="2"
        />
      )}
    </svg>
  );
};

// ── Chiffre clé ─────────────────────────────────────────────────────────────

export const Kpi = ({
  label,
  icon,
  accent,
  value,
  foot,
  onClick,
  testId = 'hx-kpi',
  className = 'hx-s3',
  children,
}: {
  label: string;
  icon: ReactNode;
  accent: string;
  value: ReactNode;
  foot?: ReactNode;
  onClick?: () => void;
  testId?: string;
  className?: string;
  /** Décor de fond (courbe) posé sous le contenu. */
  children?: ReactNode;
}) => {
  const body = (
    <>
      {children}
      <span className="hx-kpi-top" style={{ position: 'relative' }}>
        <span className="hx-kpi-label">{label}</span>
        <span
          className="hx-kpi-icon"
          style={{ background: tint(accent, 0.14), color: accent }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </span>
      <span className="hx-kpi-value" style={{ position: 'relative' }}>
        {value}
      </span>
      <span className="hx-kpi-foot" style={{ position: 'relative' }}>
        {foot}
      </span>
    </>
  );
  return onClick ? (
    <button
      type="button"
      className={`hx-card hx-kpi hx-kpi--link ${className}`}
      onClick={onClick}
      data-testid={testId}
      style={{ overflow: 'hidden' }}
    >
      {body}
    </button>
  ) : (
    <div
      className={`hx-card hx-kpi ${className}`}
      data-testid={testId}
      style={{ overflow: 'hidden' }}
    >
      {body}
    </div>
  );
};

// ── Colonnes groupées (par mois) ────────────────────────────────────────────

export type BarSeries = { key: string; label: string; color: string };
export type BarRow = {
  key: string;
  /** Libellé court sous la colonne. */
  axis: string;
  /** Titre de l'infobulle. */
  title: string;
  values: number[];
  /** Ligne de plus dans l'infobulle. */
  note?: string;
};

export const GroupedBars = ({
  rows,
  series,
  format,
  axisFormat,
  height = 168,
  ariaLabel,
}: {
  rows: BarRow[];
  series: BarSeries[];
  format: (n: number) => string;
  axisFormat: (n: number) => string;
  height?: number;
  ariaLabel: string;
}) => {
  const [on, setOn] = useState<number | null>(null);
  const ticks = niceScale(Math.max(0, ...rows.flatMap((r) => r.values)));
  const top = ticks[ticks.length - 1] || 1;
  const h = (v: number) => (v > 0 ? Math.max(3, (v / top) * height) : 0);
  const row = on != null ? rows[on] : null;
  const barW = series.length > 2 ? 'min(16px, 26%)' : 'min(22px, 34%)';
  return (
    <div className="hx-chart">
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height }}
      >
        {ticks.map((t) => (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: (t / top) * height,
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
              {axisFormat(t)}
            </span>
          </div>
        ))}
      </div>
      <div
        role="list"
        aria-label={ariaLabel}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          height,
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setOn(null);
        }}
      >
        {rows.map((r, i) => (
          <div
            key={r.key}
            role="listitem"
            tabIndex={0}
            className="hx-col"
            data-on={on === i}
            aria-label={`${r.title} : ${series.map((s, k) => `${s.label} ${format(r.values[k] || 0)}`).join(', ')}`}
            // Survol à la souris seulement ; au doigt, l'appui (clic) ouvre la colonne touchée.
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') setOn(i);
            }}
            onClick={() => setOn(i)}
            onFocus={() => setOn(i)}
            onBlur={() => setOn(null)}
          >
            {series.map((s, k) => (
              <span
                key={s.key}
                className="hx-bar"
                style={{
                  width: barW,
                  height: h(r.values[k] || 0),
                  background: s.color,
                }}
              />
            ))}
          </div>
        ))}
        {row && on != null && (
          <div
            className="hx-tip"
            role="status"
            style={{
              bottom: height + 8,
              left: `${Math.min(78, Math.max(22, ((on + 0.5) / rows.length) * 100))}%`,
            }}
          >
            <strong style={{ display: 'block', marginBottom: 4 }}>
              {row.title}
            </strong>
            {series.map((s, k) => (
              <span key={s.key} style={{ display: 'block' }}>
                <i style={{ background: s.color }} />
                {s.label} {format(row.values[k] || 0)}
              </span>
            ))}
            {row.note && (
              <span
                style={{ display: 'block', color: 'rgba(226,232,255,0.7)' }}
              >
                {row.note}
              </span>
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', marginTop: 8 }}>
        {rows.map((r) => (
          <span
            key={r.key}
            style={{ flex: 1, textAlign: 'center', fontSize: 11, color: MUTED }}
          >
            {r.axis}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Légende (deux séries ou plus). */
export const Legend = ({ series }: { series: BarSeries[] }) => (
  <div className="hx-legend" style={{ margin: 0 }}>
    {series.map((s) => (
      <span key={s.key}>
        <i style={{ background: s.color }} />
        {s.label}
      </span>
    ))}
  </div>
);

// ── Jauges classées (une teinte) ────────────────────────────────────────────

export const MeterList = ({
  items,
  color,
  format = String,
}: {
  items: Array<{
    key: string;
    label: string;
    value: number;
    onClick?: () => void;
  }>;
  color: string;
  format?: (n: number) => string;
}) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="hx-meters">
      {items.map((it) => (
        <li key={it.key} data-testid="hx-meter">
          <div className="hx-meter-head">
            {it.onClick ? (
              <button type="button" onClick={it.onClick}>
                {it.label}
              </button>
            ) : (
              <span>{it.label}</span>
            )}
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
              {format(it.value)}
            </strong>
          </div>
          <div
            className="hx-meter-track"
            style={{ background: tint(color, 0.16) }}
          >
            <div
              className="hx-meter-fill"
              style={{
                width: `${it.value > 0 ? Math.max(3, (it.value / max) * 100) : 0}%`,
                background: color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};
