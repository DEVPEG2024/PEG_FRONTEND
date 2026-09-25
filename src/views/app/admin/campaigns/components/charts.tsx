import { useEffect, useRef, useState } from 'react';
import type { CampaignTimeline } from '@/@types/campaign';
import { fmtInt, pct } from '@/utils/campaignFormat';
import { hintStyle } from '../ui';

/**
 * Graphiques des statistiques de campagne (SVG, sans bibliothèque).
 * Couleurs validées sur la surface sombre (validateur dataviz : bande de clarté,
 * daltonisme, contraste) : ouvertures #1fae5b, clics #3b82f6 ; l'écart tritan
 * étant dans la zone plancher, l'identité est doublée par la légende et les
 * étiquettes de fin de courbe.
 */

export const SERIES = { opens: '#1fae5b', clicks: '#3b82f6' };
const FUNNEL_RAMP = ['#93c5fd', '#5b9cf8', '#2563eb'];
const SURFACE = '#13223a';
const GRID = 'rgba(255,255,255,0.08)';
const INK = 'rgba(255,255,255,0.88)';
const MUTED = 'rgba(255,255,255,0.45)';

const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
};

const niceMax = (v: number) => {
  if (v <= 4) return 4; // graduations entières 0 / 2 / 4
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => v <= s * 4) || pow * 10;
  return Math.ceil(v / step) * step;
};

const pointLabel = (iso: string, unit: 'hour' | 'day', long = false) => {
  const d = new Date(iso);
  if (unit === 'hour') {
    const h = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return long ? `${d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · ${h}` : `${d.getHours()}h`;
  }
  return d.toLocaleDateString('fr-FR', long ? { weekday: 'short', day: 'numeric', month: 'long' } : { day: '2-digit', month: '2-digit' });
};

/** Ouvertures et clics cumulés depuis l'envoi — réticule + infobulle au survol et au clavier. */
export const OpensChart = ({ timeline }: { timeline: CampaignTimeline }) => {
  const { ref, width } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const pts = timeline.points;
  const height = 230;
  const m = { top: 14, right: 96, bottom: 28, left: 40 };
  const w = Math.max(80, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const max = niceMax(Math.max(1, ...pts.map((p) => p.cumulativeOpens)));
  const x = (i: number) => m.left + (pts.length <= 1 ? w / 2 : (i / (pts.length - 1)) * w);
  const y = (v: number) => m.top + h - (v / max) * h;
  const ticksY = [0, max / 2, max].filter((v, i, a) => a.indexOf(v) === i);
  const tickEvery = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(w / 70))));

  const path = (key: 'cumulativeOpens' | 'cumulativeClicks') =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const area = pts.length
    ? `${path('cumulativeOpens')} L${x(pts.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
    : '';

  const last = pts[pts.length - 1];
  const endOpensY = last ? y(last.cumulativeOpens) : 0;
  const endClicksY = last ? y(last.cumulativeClicks) : 0;
  // Étiquettes de fin trop proches : on garde celle des ouvertures, l'infobulle porte l'autre.
  const clicksLabelFits = Math.abs(endOpensY - endClicksY) >= 16;

  const onMove = (clientX: number, rect: DOMRect) => {
    const rel = ((clientX - rect.left) / rect.width) * width - m.left;
    const i = pts.length <= 1 ? 0 : Math.round((rel / w) * (pts.length - 1));
    setHover(Math.max(0, Math.min(pts.length - 1, i)));
  };

  const hp = hover !== null ? pts[hover] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        {([['opens', 'Ouvertures cumulées'], ['clicks', 'Clics cumulés']] as const).map(([k, label]) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: INK, fontSize: '12px' }}>
            <span style={{ width: '14px', height: '2px', background: SERIES[k], borderRadius: '1px' }} /> {label}
          </span>
        ))}
        <button type="button" onClick={() => setShowTable((v) => !v)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#93c5fd', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
          {showTable ? 'Voir le graphique' : 'Voir les données'}
        </button>
      </div>

      {showTable ? (
        <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: INK, fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr style={{ color: MUTED, textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>{timeline.unit === 'hour' ? 'Heure' : 'Jour'}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Ouvertures</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cumul</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Clics</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Cumul</th>
              </tr>
            </thead>
            <tbody>
              {pts.map((p) => (
                <tr key={p.t} style={{ borderTop: `1px solid ${GRID}` }}>
                  <td style={{ padding: '6px 8px' }}>{pointLabel(p.t, timeline.unit, true)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{p.opens}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{p.cumulativeOpens}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{p.clicks}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{p.cumulativeClicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} style={{ position: 'relative', width: '100%' }}>
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={last ? `Ouvertures cumulées : ${last.cumulativeOpens}, clics cumulés : ${last.cumulativeClicks}` : 'Aucune donnée'}
            tabIndex={0}
            style={{ display: 'block', outline: 'none', touchAction: 'pan-y' }}
            onPointerMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(pts.length - 1)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') setHover((i) => Math.min(pts.length - 1, (i ?? -1) + 1));
              if (e.key === 'ArrowLeft') setHover((i) => Math.max(0, (i ?? pts.length) - 1));
            }}
          >
            {ticksY.map((v) => (
              <g key={v}>
                <line x1={m.left} x2={m.left + w} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
                <text x={m.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtInt(v)}</text>
              </g>
            ))}
            {pts.map((p, i) => (i % tickEvery === 0 || i === pts.length - 1) && (
              <text key={p.t} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill={MUTED}>{pointLabel(p.t, timeline.unit)}</text>
            ))}
            <path d={area} fill={SERIES.opens} opacity={0.1} />
            <path d={path('cumulativeOpens')} fill="none" stroke={SERIES.opens} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path d={path('cumulativeClicks')} fill="none" stroke={SERIES.clicks} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {last && (
              <>
                <circle cx={x(pts.length - 1)} cy={endClicksY} r={4} fill={SERIES.clicks} stroke={SURFACE} strokeWidth={2} />
                <circle cx={x(pts.length - 1)} cy={endOpensY} r={4} fill={SERIES.opens} stroke={SURFACE} strokeWidth={2} />
                <text x={x(pts.length - 1) + 10} y={endOpensY + 4} fontSize="12" fill={INK} fontWeight={600}>{fmtInt(last.cumulativeOpens)} ouv.</text>
                {clicksLabelFits && <text x={x(pts.length - 1) + 10} y={endClicksY + 4} fontSize="12" fill={INK} fontWeight={600}>{fmtInt(last.cumulativeClicks)} clic{last.cumulativeClicks > 1 ? 's' : ''}</text>}
              </>
            )}
            {hp && hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + h} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
                <circle cx={x(hover)} cy={y(hp.cumulativeClicks)} r={4} fill={SERIES.clicks} stroke={SURFACE} strokeWidth={2} />
                <circle cx={x(hover)} cy={y(hp.cumulativeOpens)} r={4} fill={SERIES.opens} stroke={SURFACE} strokeWidth={2} />
              </g>
            )}
          </svg>
          {hp && hover !== null && (
            <div
              style={{
                position: 'absolute', top: '4px',
                left: `${Math.min(Math.max(x(hover) + 12, 0), width - 170)}px`,
                width: '158px', pointerEvents: 'none',
                background: '#0b1220', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', padding: '8px 10px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.4)', fontSize: '12px', color: MUTED,
              }}
            >
              <div style={{ marginBottom: '4px' }}>{pointLabel(hp.t, timeline.unit, true)}</div>
              {([['opens', hp.cumulativeOpens, hp.opens, hp.cumulativeOpens > 1 ? 'ouvertures' : 'ouverture'], ['clicks', hp.cumulativeClicks, hp.clicks, hp.cumulativeClicks > 1 ? 'clics' : 'clic']] as const).map(([k, total, n, label]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '2px', background: SERIES[k] }} />
                  <strong style={{ color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{fmtInt(total)}</strong> {label}
                  {n > 0 && <span style={{ marginLeft: 'auto' }}>+{n}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <span style={hintStyle}>{timeline.unit === 'hour' ? 'Par heure depuis l’envoi (72 premières heures).' : 'Par jour depuis l’envoi.'} Seule la première ouverture de chaque destinataire est comptée.</span>
    </div>
  );
};

/** Destinataires → ouvertures → clics (rampe ordinale d'une seule teinte). */
export const Funnel = ({ recipients, opened, clicked }: { recipients: number; opened: number; clicked: number }) => {
  const rows = [
    { label: 'Destinataires', value: recipients, rate: null as number | null },
    { label: 'Ont ouvert', value: opened, rate: recipients ? opened / recipients : 0 },
    { label: 'Ont cliqué', value: clicked, rate: recipients ? clicked / recipients : 0 },
  ];
  const max = Math.max(1, recipients);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '104px 1fr auto', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: MUTED, fontSize: '12px' }}>{r.label}</span>
          <div style={{ height: '18px', display: 'flex', alignItems: 'center' }} title={`${r.label} : ${fmtInt(r.value)}`}>
            <div style={{ width: `${Math.max(r.value ? 1.5 : 0, (r.value / max) * 100)}%`, height: '18px', background: FUNNEL_RAMP[i], borderRadius: '0 4px 4px 0' }} />
          </div>
          <span style={{ color: INK, fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: '84px', textAlign: 'right' }}>
            {fmtInt(r.value)}{r.rate !== null && <span style={{ color: MUTED, fontWeight: 400 }}> · {pct(r.rate)}</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Canal de la première ouverture — une série, une couleur. */
export const ChannelBars = ({ data }: { data: { label: string; value: number }[] }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!total) return <span style={hintStyle}>Aucune ouverture pour l’instant.</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((d) => (
        <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '84px 1fr auto', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: MUTED, fontSize: '12px' }}>{d.label}</span>
          <div style={{ height: '14px', display: 'flex', alignItems: 'center' }} title={`${d.label} : ${fmtInt(d.value)}`}>
            <div style={{ width: `${Math.max(d.value ? 1.5 : 0, (d.value / max) * 100)}%`, height: '14px', background: SERIES.clicks, borderRadius: '0 4px 4px 0' }} />
          </div>
          <span style={{ color: INK, fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: '64px', textAlign: 'right' }}>
            {fmtInt(d.value)} <span style={{ color: MUTED, fontWeight: 400 }}>· {pct(d.value / total)}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

