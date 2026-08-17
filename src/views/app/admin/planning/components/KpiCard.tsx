import { Sparkline, Donut } from './charts';
import { rgba } from '../theme';

type Props = {
  icon: JSX.Element;
  label: string;
  value: string;
  color: string;
  caption?: string;
  series?: number[];
  /** Ce que représente la sparkline — sans ça, une courbe n'informe de rien. */
  seriesLabel?: string;
  donutPct?: number;
  /** Rend la carte cliquable (filtre du board). */
  onClick?: () => void;
  active?: boolean;
};

const KpiCard = ({ icon, label, value, color, caption, series, seriesLabel, donutPct, onClick, active }: Props) => {
  const interactive = !!onClick;
  const content = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: rgba(color, 0.95) }}>
        {icon}
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', fontWeight: 600 }}>{label}</span>
        {active && (
          <span style={{ marginLeft: 'auto', background: rgba(color, 0.2), border: `1px solid ${rgba(color, 0.45)}`, borderRadius: '100px', padding: '1px 7px', color, fontSize: '10px', fontWeight: 700 }}>
            filtré
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flex: 1 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color, fontSize: '30px', fontWeight: 800, lineHeight: 1.05 }}>{value}</div>
          {caption && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>{caption}</div>}
        </div>
        <div style={{ flexShrink: 0, alignSelf: 'center', textAlign: 'center' }} title={seriesLabel}>
          {donutPct !== undefined ? (
            <Donut pct={donutPct} color={color} label={`${donutPct}%`} />
          ) : series ? (
            <>
              <Sparkline data={series} color={color} />
              {seriesLabel && (
                <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: '9px', marginTop: '2px', maxWidth: '110px' }}>{seriesLabel}</div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );

  const style: React.CSSProperties = {
    background: active
      ? `linear-gradient(160deg, ${rgba(color, 0.18)}, rgba(13,16,24,0.9))`
      : 'linear-gradient(160deg, rgba(22,28,43,0.9), rgba(13,16,24,0.9))',
    border: `1px solid ${rgba(color, active ? 0.6 : 0.28)}`,
    borderRadius: '16px',
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '128px',
    textAlign: 'left',
    fontFamily: 'Inter, sans-serif',
    width: '100%',
    boxSizing: 'border-box',
  };

  if (!interactive) return <div style={style}>{content}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      title={active ? 'Retirer le filtre' : 'Filtrer le board sur ces projets'}
      style={{ ...style, cursor: 'pointer' }}
    >
      {content}
    </button>
  );
};

export default KpiCard;
