import { useState } from 'react';
import { TbSearch, TbPlus, TbChevronLeft, TbChevronRight, TbPencil, TbAlertTriangle } from 'react-icons/tb';
import { ResourceRow } from '@/utils/planning/scheduler';
import { RISK_COLOR, PLANNING_ACCENT, rgba, isToday } from '../theme';

type Props = {
  rows: ResourceRow[];
  days: Date[];
  onEditCapacity?: (row: ResourceRow) => void;
  onProjectClick?: (documentId: string) => void;
};

const ROW_H = 70;
const HEAD_H = 58;

function ratioColor(pct: number): string {
  if (pct > 100) return RISK_COLOR.late;
  if (pct >= 85) return RISK_COLOR.tight;
  return RISK_COLOR.ok;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

const ResourceBoard = ({ rows, days, onEditCapacity, onProjectClick }: Props) => {
  const [search, setSearch] = useState('');
  const filtered = rows.filter((r) => r.producerName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '262px 1fr',
        background: 'linear-gradient(160deg, rgba(18,22,34,0.6), rgba(11,14,21,0.6))',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '20px',
      }}
    >
      {/* ---- Colonne gauche : producteurs ---- */}
      <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ height: HEAD_H, padding: '0 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>Producteurs</span>
        </div>
        <div style={{ padding: '10px 12px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '7px 10px' }}>
            <TbSearch size={14} color="rgba(255,255,255,0.4)" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12.5px', width: '100%', fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>

        {filtered.map((row) => {
          const rc = ratioColor(row.ratioPct);
          return (
            <div key={row.producerId} style={{ height: ROW_H, padding: '0 14px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: rgba(PLANNING_ACCENT, 0.18), border: `1px solid ${rgba(PLANNING_ACCENT, 0.35)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7d2fe', fontSize: '12px', fontWeight: 700 }}>
                {initials(row.producerName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.producerName}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{row.blocks.filter((b) => b.kind === 'project').length} projet(s)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: rc, fontSize: '12.5px', fontWeight: 800 }}>
                  {row.overloaded && <TbAlertTriangle size={11} />}
                  {row.ratioPct}%
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10.5px' }}>{row.totalDays} / {row.capacityDays} j</div>
              </div>
              {onEditCapacity && row.producerId !== '__unassigned__' && (
                <button title="Éditer la capacité" onClick={() => onEditCapacity(row)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'inline-flex' }}>
                  <TbPencil size={13} />
                </button>
              )}
            </div>
          );
        })}

        <div style={{ padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#c7d2fe', fontSize: '12px', fontWeight: 600, border: `1px dashed ${rgba(PLANNING_ACCENT, 0.4)}`, borderRadius: '10px', padding: '9px' }}>
            <TbPlus size={14} /> Ajouter un producteur
          </div>
        </div>
      </div>

      {/* ---- Colonne droite : board jours ---- */}
      <div style={{ overflowX: 'auto' }}>
        {/* En-tête jours */}
        <div style={{ height: HEAD_H, display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(140px, 1fr))`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {days.map((d, i) => {
            const today = isToday(d);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)', color: today ? '#a5b4fc' : 'rgba(255,255,255,0.55)', fontSize: '12.5px', fontWeight: today ? 800 : 600, textTransform: 'capitalize', background: today ? rgba(PLANNING_ACCENT, 0.08) : 'transparent' }}>
                {today && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: PLANNING_ACCENT }} />}
                {d.toLocaleDateString('fr-FR', { weekday: 'short' })} {d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </div>
            );
          })}
        </div>

        {/* Lignes producteurs */}
        {filtered.map((row) => (
          <div key={row.producerId} style={{ height: ROW_H, display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(140px, 1fr))`, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {Array.from({ length: days.length }).map((_, col) => {
              const block = row.blocks[col];
              const today = isToday(days[col]);
              const cellBase: React.CSSProperties = {
                borderLeft: col === 0 ? 'none' : '1px solid rgba(255,255,255,0.03)',
                background: today ? rgba(PLANNING_ACCENT, 0.04) : 'transparent',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
              };
              if (!block) return <div key={col} style={cellBase} />;
              if (block.kind === 'available') {
                return (
                  <div key={col} style={cellBase}>
                    <div style={{ width: '100%', height: '100%', minHeight: '46px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '9px', border: '1px dashed rgba(255,255,255,0.18)', padding: '6px 9px', color: 'rgba(255,255,255,0.45)' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 600 }}>Disponible</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{block.days} j</span>
                    </div>
                  </div>
                );
              }
              const color = RISK_COLOR[block.risk ?? 'ok'];
              return (
                <div key={col} style={cellBase}>
                  <button
                    onClick={() => block.project && onProjectClick?.(block.project.project.documentId)}
                    title={block.project?.project.name}
                    style={{ width: '100%', height: '100%', minHeight: '46px', textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px', borderRadius: '9px', background: rgba(color, 0.12), border: `1px solid ${rgba(color, 0.3)}`, borderLeft: `3px solid ${color}`, padding: '6px 9px' }}
                  >
                    <span style={{ color: '#fff', fontSize: '11.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                      {block.project?.project.name}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{block.days} j</span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceBoard;
