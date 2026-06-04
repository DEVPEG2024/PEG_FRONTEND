import { TbAlertTriangle, TbPencil } from 'react-icons/tb';
import { ProducerLoad } from '@/utils/planning/scheduler';
import { rgba } from '../theme';

type Props = {
  loads: ProducerLoad[];
  /** si fourni, affiche un crayon pour éditer la capacité du producteur */
  onEdit?: (load: ProducerLoad) => void;
};

const ProducerLoadList = ({ loads, onEdit }: Props) => {
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color, fontSize: '12px', fontWeight: 700 }}>
                  {p.totalDays} / {p.capacityDays} j{p.hasCustomCapacity ? '' : ' *'}
                </span>
                {onEdit && p.producerId !== '__unassigned__' && (
                  <button
                    title="Éditer la capacité"
                    onClick={() => onEdit(p)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '7px',
                      background: p.hasCustomCapacity ? rgba('#6366f1', 0.18) : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${p.hasCustomCapacity ? rgba('#6366f1', 0.4) : 'rgba(255,255,255,0.12)'}`,
                      color: p.hasCustomCapacity ? '#c7d2fe' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                    }}
                  >
                    <TbPencil size={12} />
                  </button>
                )}
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
