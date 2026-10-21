// Petite courbe d'un chiffre clé : les 7 derniers jours (ligne) ou les 7
// prochains jours (barres, livraisons). Trait discret, jour en cours à la
// couleur de la carte ; au survol, un repère vertical et la valeur du jour.
// Les valeurs restent lisibles sans souris (texte pour les lecteurs d'écran).
import { useState, type MouseEvent } from 'react';
import dayjs from 'dayjs';
import type { SeriesPoint } from './villageModel';

interface Props {
  points: SeriesPoint[];
  /** Couleur de la carte : jour en cours, repère. */
  accent: string;
  /** 'past' = 7 derniers jours (ligne), 'next' = 7 prochains jours (barres). */
  kind: 'past' | 'next';
  width?: number;
  height?: number;
  /** Unité lue avec la valeur (« livraisons »…). */
  unit?: [string, string];
  /** Couleur des jours sans livraison (fond sombre : plus discrète). */
  track?: string;
}

const PAD_X = 4;
const PAD_Y = 4;
/** Amplitude minimale de la courbe, en unités du chiffre suivi. */
const MIN_SPAN = 4;
/** Hauteur de référence des barres : une livraison seule n'est pas une barre pleine. */
const MIN_BARS = 3;

/** « aujourd'hui », « hier », « demain », sinon « jeu. 16 oct. ». */
const dayName = (day: string) => {
  const diff = dayjs(day).diff(dayjs().startOf('day'), 'day');
  if (diff === 0) return 'aujourd’hui';
  if (diff === -1) return 'hier';
  if (diff === 1) return 'demain';
  return dayjs(day).format('ddd D MMM');
};

const VillageSparkline = ({
  points,
  accent,
  kind,
  width = 76,
  height = 30,
  unit,
  track = '#e5e7eb',
}: Props) => {
  const [hover, setHover] = useState<number | null>(null);
  const values = points.map((p) => p.value);
  const known = values.filter((v): v is number => v !== null);
  if (known.length < (kind === 'past' ? 2 : 1)) return null;

  // Échelle : un écart d'une ou deux unités ne doit pas occuper toute la
  // hauteur (1 → 2 BAT n'est pas une envolée) ; les barres partent de zéro.
  const lo = Math.min(...known);
  const hi = Math.max(...known);
  const pad = Math.max(0, (MIN_SPAN - (hi - lo)) / 2);
  const max = kind === 'next' ? Math.max(hi, MIN_BARS) : hi + pad;
  const min = kind === 'next' ? 0 : lo - pad;
  const span = max - min || 1;
  const n = points.length;
  const xAt = (i: number) =>
    PAD_X + (n === 1 ? 0 : (i * (width - 2 * PAD_X)) / (n - 1));
  const yAt = (v: number) =>
    max === min
      ? height / 2
      : height - PAD_Y - ((v - min) * (height - 2 * PAD_Y)) / span;
  const soft = `${accent}99`;

  // Ligne en segments : une photo manquante coupe la courbe au lieu d'inventer.
  let path = '';
  let open = false;
  values.forEach((v, i) => {
    if (v === null) {
      open = false;
      return;
    }
    path += `${open ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)} `;
    open = true;
  });
  const last = n - 1;
  // Une photo seule entre deux jours manquants : un point, sinon invisible.
  const isolated = values.flatMap((v, i) =>
    v !== null &&
    i !== last &&
    (i === 0 || values[i - 1] === null) &&
    values[i + 1] === null
      ? [i]
      : []
  );

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * width;
    let best = 0;
    for (let i = 1; i < n; i++)
      if (Math.abs(xAt(i) - x) < Math.abs(xAt(best) - x)) best = i;
    setHover(values[best] === null ? null : best);
  };

  const label = (p: SeriesPoint) =>
    `${dayName(p.day)} : ${p.value}${unit && p.value !== null ? ` ${p.value > 1 ? unit[1] : unit[0]}` : ''}`;
  const barW = (width - 2 * PAD_X) / n - 3;
  const shown = hover ?? null;

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* zone de survol plus grande que la courbe */}
        <rect
          x={0}
          y={-6}
          width={width}
          height={height + 12}
          fill="transparent"
        />
        {kind === 'past' ? (
          <>
            <path
              d={path}
              fill="none"
              stroke={soft}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {isolated.map((i) => (
              <circle
                key={i}
                cx={xAt(i)}
                cy={yAt(values[i] as number)}
                r={2}
                fill={soft}
              />
            ))}
            {values[last] !== null && (
              <circle
                cx={xAt(last)}
                cy={yAt(values[last] as number)}
                r={4}
                fill={accent}
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}
          </>
        ) : (
          points.map((p, i) => {
            const v = p.value ?? 0;
            const h = v ? Math.max(3, height - PAD_Y - yAt(v)) : 2;
            const x = xAt(i) - barW / 2;
            return (
              <rect
                key={p.day}
                x={Math.max(0, x)}
                y={height - PAD_Y - h}
                width={barW}
                height={h}
                rx={v ? 2 : 1}
                fill={i === 0 ? accent : v ? soft : track}
              />
            );
          })
        )}
        {shown !== null && (
          <>
            <line
              x1={xAt(shown)}
              x2={xAt(shown)}
              y1={-2}
              y2={height}
              stroke="#9ca3af"
              strokeWidth={1}
            />
            {kind === 'past' && values[shown] !== null && (
              <circle
                cx={xAt(shown)}
                cy={yAt(values[shown] as number)}
                r={3.5}
                fill="#ffffff"
                stroke={accent}
                strokeWidth={2}
              />
            )}
          </>
        )}
      </svg>
      {shown !== null && (
        <span
          role="presentation"
          style={{
            position: 'absolute',
            left: xAt(shown),
            bottom: height + 8,
            transform: 'translateX(-50%)',
            padding: '4px 8px',
            borderRadius: 8,
            background: '#111827',
            color: '#ffffff',
            fontSize: 11.5,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <strong style={{ fontWeight: 800 }}>{points[shown].value}</strong>{' '}
          <span style={{ color: '#d1d5db' }}>{dayName(points[shown].day)}</span>
        </span>
      )}
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {kind === 'past' ? '7 derniers jours : ' : '7 prochains jours : '}
        {points
          .filter((p) => p.value !== null)
          .map(label)
          .join(', ')}
      </span>
    </span>
  );
};

export default VillageSparkline;
