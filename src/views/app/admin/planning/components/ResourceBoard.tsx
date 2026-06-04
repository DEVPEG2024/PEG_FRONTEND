import { useState } from 'react';
import { TbSearch, TbPlus, TbPencil, TbAlertTriangle } from 'react-icons/tb';
import { TimelineRow, formatBlocks } from '@/utils/planning/scheduler';
import { RISK_COLOR, PLANNING_ACCENT, rgba, isToday } from '../theme';

type Props = {
  rows: TimelineRow[];
  days: Date[];
  onEditCapacity?: (row: TimelineRow) => void;
};

const ROW_H = 68;
const HEAD_H = 58;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}
function isWeekend(d: Date): boolean {
  const x = d.getDay();
  return x === 0 || x === 6;
}
function ratioColor(pct: number): string {
  if (pct > 100) return RISK_COLOR.late;
  if (pct >= 85) return RISK_COLOR.tight;
  return RISK_COLOR.ok;
}
function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/** Total blocs utilisés vs capacité sur les jours visibles (jours ouvrés). */
function rowTotals(row: TimelineRow, days: Date[]) {
  let used = 0;
  let cap = 0;
  for (const d of days) {
    if (isWeekend(d)) continue;
    used += row.byDay[dateKey(d)]?.blocks ?? 0;
    cap += row.dailyCapacityBlocks;
  }
  return { used, cap, pct: cap > 0 ? Math.round((used / cap) * 100) : 0 };
}

const DayCell = ({ row, day }: { row: TimelineRow; day: Date }) => {
  const today = isToday(day);
  const base: React.CSSProperties = {
    borderLeft: '1px solid rgba(255,255,255,0.03)',
    background: today ? rgba(PLANNING_ACCENT, 0.04) : 'transparent',
    padding: '10px 8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '5px',
  };

  if (isWeekend(day)) {
    return <div style={{ ...base, alignItems: 'center', color: 'rgba(255,255,255,0.18)', fontSize: '11px' }}>—</div>;
  }

  const load = row.byDay[dateKey(day)];
  const cap = row.dailyCapacityBlocks;
  const used = load?.blocks ?? 0;

  if (used === 0) {
    return (
      <div style={base}>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10.5px' }}>—</div>
        <div style={{ height: '7px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)' }} />
      </div>
    );
  }

  const overloaded = used > cap;
  const denom = Math.max(used, cap);
  const title = (load?.details ?? [])
    .slice()
    .sort((a, b) => b.blocks - a.blocks)
    .map((d) => `${d.name} — ${formatBlocks(d.blocks)}`)
    .join('\n');
  const headColor = overloaded ? RISK_COLOR.late : ratioColor((used / cap) * 100);

  return (
    <div style={base} title={title}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
        <span style={{ color: headColor, fontSize: '11px', fontWeight: 700 }}>
          {formatBlocks(used)} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>/ {formatBlocks(cap)}</span>
        </span>
        {overloaded && <TbAlertTriangle size={11} color={RISK_COLOR.late} />}
      </div>
      <div style={{ display: 'flex', height: '8px', borderRadius: '100px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)', border: overloaded ? `1px solid ${rgba(RISK_COLOR.late, 0.6)}` : 'none' }}>
        {(load?.details ?? []).map((d, i) => (
          <div key={i} style={{ width: `${(d.blocks / denom) * 100}%`, background: RISK_COLOR[d.risk], opacity: 0.9 }} />
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher" style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12.5px', width: '100%', fontFamily: 'Inter, sans-serif' }} />
          </div>
        </div>

        {filtered.map((row) => {
          const t = rowTotals(row, days);
          const rc = ratioColor(t.pct);
          const projCount = new Set(Object.values(row.byDay).flatMap((d) => d.details.map((x) => x.documentId))).size;
          return (
            <div key={row.producerId} style={{ height: ROW_H, padding: '0 14px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: rgba(PLANNING_ACCENT, 0.18), border: `1px solid ${rgba(PLANNING_ACCENT, 0.35)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7d2fe', fontSize: '12px', fontWeight: 700 }}>
                {initials(row.producerName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.producerName}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{projCount} projet(s) · {formatBlocks(t.used)}/sem.</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: rc, fontSize: '12.5px', fontWeight: 800 }}>
                  {t.pct > 100 && <TbAlertTriangle size={11} />}
                  {t.pct}%
                </div>
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
        <div style={{ height: HEAD_H, display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(118px, 1fr))`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
          <div key={row.producerId} style={{ height: ROW_H, display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(118px, 1fr))`, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
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
