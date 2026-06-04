import { TbAlertTriangle } from 'react-icons/tb';
import { ProducerLoad } from '@/utils/planning/scheduler';
import { rgba } from '../theme';

type Props = { loads: ProducerLoad[] };

const ProducerLoadList = ({ loads }: Props) => {
  if (loads.length === 0) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
        Aucune charge producteur à afficher.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {loads.map((p) => {
        const ratio = p.capacityDays > 0 ? p.totalDays / p.capacityDays : 0;
        const pct = Math.min(100, Math.round(ratio * 100));
        const color = p.overloaded ? '#ef4444' : ratio > 0.75 ? '#f59e0b' : '#22c55e';
        return (
          <div key={p.producerId}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                {p.overloaded && <TbAlertTriangle size={14} color="#ef4444" />}
                {p.producerName}
                <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>· {p.projectCount} projet(s)</span>
              </span>
              <span style={{ color, fontSize: '12px', fontWeight: 700 }}>
                {p.totalDays} / {p.capacityDays} j
              </span>
            </div>
            <div style={{ height: '8px', borderRadius: '100px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '100px' }} />
            </div>
            {p.overloaded && (
              <div style={{ color: rgba('#ef4444', 0.9), fontSize: '11px', marginTop: '3px' }}>
                Surcharge : {p.totalDays - p.capacityDays} j au-dessus de la capacité — redistribuer ou décaler.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProducerLoadList;
