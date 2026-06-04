import { Sparkline, Donut } from './charts';
import { rgba } from '../theme';

type Props = {
  icon: JSX.Element;
  label: string;
  value: string;
  color: string;
  caption?: string;
  series?: number[];
  donutPct?: number;
};

const KpiCard = ({ icon, label, value, color, caption, series, donutPct }: Props) => (
  <div
    style={{
      background: 'linear-gradient(160deg, rgba(22,28,43,0.9), rgba(13,16,24,0.9))',
      border: `1px solid ${rgba(color, 0.28)}`,
      borderRadius: '16px',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      minHeight: '128px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: rgba(color, 0.95) }}>
      {icon}
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', fontWeight: 600 }}>{label}</span>
    </div>

    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flex: 1 }}>
      <div>
        <div style={{ color, fontSize: '30px', fontWeight: 800, lineHeight: 1.05 }}>{value}</div>
        {caption && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '4px' }}>{caption}</div>}
      </div>
      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
        {donutPct !== undefined ? (
          <Donut pct={donutPct} color={color} label={`${donutPct}%`} />
        ) : series ? (
          <Sparkline data={series} color={color} />
        ) : null}
      </div>
    </div>
  </div>
);

export default KpiCard;
