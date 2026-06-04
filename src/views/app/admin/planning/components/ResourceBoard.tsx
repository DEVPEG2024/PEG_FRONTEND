import { useState } from 'react';
import { TbSearch, TbPlus, TbPencil } from 'react-icons/tb';
import { TimelineRow, formatBlocks } from '@/utils/planning/scheduler';
import { PLANNING_ACCENT, RISK_COLOR, rgba, isToday, projectColor, loadStatus } from '../theme';

type Props = {
  rows: TimelineRow[];
  days: Date[];
  onEditCapacity?: (row: TimelineRow) => void;
};

const ROW_H = 74;
const HEAD_H = 58;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}
function isWeekend(d: Date): boolean {
  const x = d.getDay();
  return x === 0 || x === 6;
}
function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}
function rowTotals(row: TimelineRow, days: Date[]) {
  let used = 0, cap = 0;
  for (const d of days) {
    if (isWeekend(d)) continue;
    used += row.byDay[dateKey(d)]?.blocks ?? 0;
    cap += row.dailyCapacityBlocks;
  }
  return { used, cap, pct: cap > 0 ? Math.round((used / cap) * 100) : 0 };
}

/** Une journée = une grille de petits carrés de 30 min (occupés par projet / libres / débordement). */
const DayCell = ({ row, day }: { row: TimelineRow; day: Date }) => {
  const today = isToday(day);
  const base: React.CSSProperties = {
    borderLeft: '1px solid rgba(255,255,255,0.03)',
    background: today ? rgba(PLANNING_ACCENT, 0.05) : 'transparent',
    padding: '9px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    justifyContent: 'center',
  };

  if (isWeekend(day)) {
    return <div style={{ ...base, alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '15px' }} title="Week-end">😴</div>;
  }

  const cap = row.dailyCapacityBlocks;
  const load = row.byDay[dateKey(day)];
  const details = (load?.details ?? []).slice().sort((a, b) => b.blocks - a.blocks);

  // un carré par bloc de 30 min, couleur = projet
  const tiles: { color: string; name: string }[] = [];
  for (const d of details) for (let i = 0; i < d.blocks; i++) tiles.push({ color: projectColor(d.documentId), name: d.name });
  const used = tiles.length;
  const overloaded = used > cap;
  const emptyCount = Math.max(0, cap - used);

  const title = details.map((d) => `${d.name} — ${formatBlocks(d.blocks)}`).join('\n');
  const Tile = (bg: string, ring: boolean, key: number, t?: string) => (
    <div key={key} title={t} style={{ width: '13px', height: '13px', borderRadius: '3px', background: bg, boxShadow: ring ? `0 0 0 1.5px ${RISK_COLOR.late}` : 'none' }} />
  );

  return (
    <div style={base} title={used ? title : undefined}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: used === 0 ? 'rgba(255,255,255,0.25)' : overloaded ? RISK_COLOR.late : 'rgba(255,255,255,0.75)' }}>
        {used === 0 ? 'libre' : overloaded ? `${formatBlocks(used)} 🔥` : formatBlocks(used)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
        {tiles.map((t, i) => Tile(t.color, i >= cap, i, t.name))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`e${i}`} style={{ width: '13px', height: '13px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
        ))}
      </div>
    </div>
  );
};

const ResourceBoard = ({ rows, days, onEditCapacity }: Props) => {
  const [search, setSearch] = useState('');
  const filtered = rows
    .filter((r) => r.producerName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => rowTotals(b, days).pct - rowTotals(a, days).pct);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '262px 1fr', background: 'linear-gradient(160deg, rgba(18,22,34,0.6), rgba(11,14,21,0.6))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', marginBottom: '12px' }}>
      {/* ---- Colonne gauche : producteurs ---- */}
      <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ height: HEAD_H, padding: '0 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>👷 Producteurs</span>
        </div>
        <div style={{ padding: '10px 12px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '7px 10px' }}>
            <TbSearch size={14} color="rgba(255,255,255,0.4)" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher" style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12.5px', width: '100%', fontFamily: 'Inter, sans-serif' }} />
          </div>
        </div>

        {filtered.map((row) => {
          const t = rowTotals(row, days);
          const st = loadStatus(t.pct);
          const projCount = new Set(Object.values(row.byDay).flatMap((d) => d.details.map((x) => x.documentId))).size;
          return (
            <div key={row.producerId} style={{ height: ROW_H, padding: '0 14px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: rgba(PLANNING_ACCENT, 0.18), border: `1px solid ${rgba(PLANNING_ACCENT, 0.35)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7d2fe', fontSize: '12px', fontWeight: 700 }}>
                {initials(row.producerName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.producerName}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '2px', color: st.color, fontSize: '11px', fontWeight: 600 }}>
                  <span>{st.emoji} {st.label}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {projCount} proj.</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: st.color, fontSize: '14px', fontWeight: 800 }}>{t.pct}%</div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{formatBlocks(t.used)}/sem.</div>
              </div>
              {onEditCapacity && row.producerId !== '__unassigned__' && (
                <button title="Régler la dispo / capacité" onClick={() => onEditCapacity(row)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'inline-flex' }}>
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
        <div style={{ height: HEAD_H, display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(124px, 1fr))`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {days.map((d, i) => {
            const today = isToday(d);
            const we = isWeekend(d);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)', color: today ? '#a5b4fc' : we ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: today ? 800 : 600, textTransform: 'capitalize', background: today ? rgba(PLANNING_ACCENT, 0.08) : 'transparent' }}>
                {today && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: PLANNING_ACCENT }} />}
                {d.toLocaleDateString('fr-FR', { weekday: 'short' })} {d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </div>
            );
          })}
        </div>

        {filtered.map((row) => (
          <div key={row.producerId} style={{ height: ROW_H, display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(124px, 1fr))`, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {days.map((day, i) => (
              <DayCell key={i} row={row} day={day} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceBoard;
