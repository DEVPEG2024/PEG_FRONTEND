import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TbSearch, TbPlus, TbPencil, TbCrosshair } from 'react-icons/tb';
import {
  TimelineRow, formatBlocks, timelineRowStats, capacityBlocksOn,
  dateKey, isWeekendDay, isoWeekNumber, UNASSIGNED_ID,
} from '@/utils/planning/scheduler';
import { PLANNING_ACCENT, RISK_COLOR, rgba, isToday, projectColor, loadStatus } from '../theme';

type Props = {
  rows: TimelineRow[];
  days: Date[];
  onEditCapacity?: (row: TimelineRow) => void;
  onDayClick?: (date: Date) => void;
  onAddProducer?: () => void;
};

const ROW_H = 74;
const HEAD_H = 56;
const WEEK_H = 24;
/** Au-delà, les colonnes sont regroupées par semaine pour rester lisibles. */
const WEEK_GROUPING_FROM = 14;

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

/** Une journée = une grille de petits carrés de 30 min. */
const DayCell = ({ row, day, onClick }: { row: TimelineRow; day: Date; onClick?: () => void }) => {
  const today = isToday(day);
  const base: React.CSSProperties = {
    borderLeft: '1px solid rgba(255,255,255,0.03)',
    background: today ? rgba(PLANNING_ACCENT, 0.05) : 'transparent',
    padding: '9px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    justifyContent: 'center',
    height: '100%',
    boxSizing: 'border-box',
    cursor: onClick ? 'pointer' : 'default',
  };

  if (isWeekendDay(day)) {
    return <div onClick={onClick} style={{ ...base, alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '15px' }} title="Week-end">😴</div>;
  }

  // Capacité RÉELLE du jour : 0 si jour off hebdo ou congé déclaré.
  const cap = capacityBlocksOn(row, day);
  const load = row.byDay[dateKey(day)];
  const details = (load?.details ?? []).slice().sort((a, b) => b.blocks - a.blocks);

  if (cap === 0 && !load) {
    return <div onClick={onClick} style={{ ...base, alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '15px' }} title="Indisponible (congé ou jour non travaillé)">🌴</div>;
  }

  const tiles: { color: string; name: string }[] = [];
  for (const d of details) for (let i = 0; i < d.blocks; i++) tiles.push({ color: projectColor(d.documentId), name: d.name });
  const used = tiles.length;
  const overloaded = cap > 0 ? used > cap : used > 0;
  const dense = row.dailyCapacityBlocks > 16; // mode flash (16 h) → carrés plus petits
  const sz = dense ? 8 : 13;
  const gap = dense ? 2 : 3;
  const emptyCount = Math.min(Math.max(0, cap - used), dense ? 16 : cap);
  const title = used
    ? `${details.map((d) => `${d.name} — ${formatBlocks(d.blocks)}`).join('\n')}\n———\nTotal ${formatBlocks(used)} / ${formatBlocks(cap)} de capacité`
    : undefined;

  return (
    <div onClick={onClick} style={base} title={title}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: used === 0 ? 'rgba(255,255,255,0.25)' : overloaded ? RISK_COLOR.late : 'rgba(255,255,255,0.75)' }}>
        {used === 0 ? 'libre' : overloaded ? `${formatBlocks(used)} 🔥` : formatBlocks(used)}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${gap}px` }}>
        {tiles.map((t, i) => (
          <div key={i} title={t.name} style={{ width: `${sz}px`, height: `${sz}px`, borderRadius: '3px', background: t.color, boxShadow: cap > 0 && i >= cap ? `0 0 0 1.5px ${RISK_COLOR.late}` : 'none' }} />
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`e${i}`} style={{ width: `${sz}px`, height: `${sz}px`, borderRadius: '3px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} />
        ))}
      </div>
    </div>
  );
};

const ResourceBoard = ({ rows, days, onEditCapacity, onDayClick, onAddProducer }: Props) => {
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => r.producerName.toLowerCase().includes(q))
      .sort((a, b) => {
        // « Non assigné » toujours en bas : ce n'est pas une vraie ressource.
        if (a.producerId === UNASSIGNED_ID) return 1;
        if (b.producerId === UNASSIGNED_ID) return -1;
        return timelineRowStats(b, days).pct - timelineRowStats(a, days).pct;
      });
  }, [rows, days, search]);

  const minW = days.length > 24 ? 80 : days.length > 12 ? 102 : 124;
  const gridCols = `repeat(${days.length}, minmax(${minW}px, 1fr))`;

  // Regroupement par semaine ISO quand l'horizon est long (vue Mois / Échéances).
  const weekGroups = useMemo(() => {
    if (days.length <= WEEK_GROUPING_FROM) return null;
    const groups: { week: number; span: number; label: string }[] = [];
    for (const d of days) {
      const w = isoWeekNumber(d);
      const last = groups[groups.length - 1];
      if (last && last.week === w) last.span += 1;
      else groups.push({ week: w, span: 1, label: `Sem. ${w}` });
    }
    return groups;
  }, [days]);

  const scrollToToday = useCallback(() => {
    const container = scrollRef.current;
    const el = container?.querySelector<HTMLElement>('[data-today="1"]');
    if (container && el) container.scrollLeft = Math.max(0, el.offsetLeft - 12);
  }, []);

  // Recentre sur aujourd'hui à l'ouverture et à chaque changement de période :
  // sur un horizon de 120 jours, s'ouvrir au lundi de la semaine était inutilisable.
  useEffect(() => {
    scrollToToday();
  }, [days.length, scrollToToday]);

  return (
    <div style={{ marginBottom: '12px' }}>
      {/* Recherche + recentrage */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 320px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 11px' }}>
          <TbSearch size={14} color="rgba(255,255,255,0.4)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher un producteur"
            placeholder="Rechercher un producteur"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '12.5px', width: '100%', fontFamily: 'Inter, sans-serif' }}
          />
        </div>
        <button
          onClick={scrollToToday}
          title="Recentrer le board sur aujourd'hui"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 12px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
        >
          <TbCrosshair size={14} /> Aujourd'hui
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '262px 1fr', background: 'linear-gradient(160deg, rgba(18,22,34,0.6), rgba(11,14,21,0.6))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
        {/* ---- Colonne gauche : producteurs ---- */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ height: HEAD_H + (weekGroups ? WEEK_H : 0), padding: '0 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>👷 Producteurs</span>
          </div>

          {filtered.length === 0 && (
            <div style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 16px', color: 'rgba(255,255,255,0.4)', fontSize: '12.5px' }}>
              Aucun producteur ne correspond.
            </div>
          )}

          {filtered.map((row) => {
            const t = timelineRowStats(row, days);
            const st = loadStatus(t.pct);
            const projCount = new Set(Object.values(row.byDay).flatMap((d) => d.details.map((x) => x.documentId))).size;
            const unassigned = row.producerId === UNASSIGNED_ID;
            return (
              <div key={row.producerId} style={{ height: ROW_H, boxSizing: 'border-box', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: rgba(unassigned ? RISK_COLOR.tight : PLANNING_ACCENT, 0.18), border: `1px solid ${rgba(unassigned ? RISK_COLOR.tight : PLANNING_ACCENT, 0.35)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: unassigned ? '#fcd34d' : '#c7d2fe', fontSize: '12px', fontWeight: 700 }}>
                  {unassigned ? '?' : initials(row.producerName)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.producerName}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '2px', fontSize: '11px', fontWeight: 600 }}>
                    {unassigned ? (
                      <span style={{ color: RISK_COLOR.tight }}>⚠️ à affecter</span>
                    ) : (
                      <span style={{ color: st.color }}>{st.emoji} {st.label}</span>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {projCount} proj.</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {!unassigned && <div style={{ color: st.color, fontSize: '14px', fontWeight: 800 }}>{t.pct}%</div>}
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }} title="Travail planifié sur la période affichée">
                    {formatBlocks(t.usedBlocks)} sur la période
                  </div>
                </div>
                {onEditCapacity && !unassigned && (
                  <button aria-label={`Régler la disponibilité de ${row.producerName}`} title="Régler la dispo / capacité" onClick={() => onEditCapacity(row)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'inline-flex' }}>
                    <TbPencil size={13} />
                  </button>
                )}
              </div>
            );
          })}

          <div style={{ padding: '12px' }}>
            <button
              onClick={onAddProducer}
              disabled={!onAddProducer}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                color: '#c7d2fe', fontSize: '12px', fontWeight: 600,
                background: 'transparent', border: `1px dashed ${rgba(PLANNING_ACCENT, 0.4)}`,
                borderRadius: '10px', padding: '9px',
                cursor: onAddProducer ? 'pointer' : 'default', opacity: onAddProducer ? 1 : 0.5,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <TbPlus size={14} /> Ajouter un producteur
            </button>
          </div>
        </div>

        {/* ---- Colonne droite : board jours ---- */}
        <div ref={scrollRef} style={{ overflowX: 'auto', position: 'relative' }}>
          {weekGroups && (
            <div style={{ height: WEEK_H, display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {weekGroups.map((g, i) => (
                <div key={i} style={{ gridColumn: `span ${g.span}`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.03em' }}>
                  {g.label}
                </div>
              ))}
            </div>
          )}

          <div style={{ height: HEAD_H, display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {days.map((d, i) => {
              const today = isToday(d);
              const we = isWeekendDay(d);
              return (
                <button
                  key={i}
                  data-today={today ? '1' : undefined}
                  onClick={onDayClick ? () => onDayClick(d) : undefined}
                  title={`Voir le détail du ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}`}
                  style={{
                    cursor: onDayClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    border: 'none', borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    color: today ? '#a5b4fc' : we ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)',
                    fontSize: '12px', fontWeight: today ? 800 : 600, textTransform: 'capitalize',
                    background: today ? rgba(PLANNING_ACCENT, 0.08) : 'transparent',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {today && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: PLANNING_ACCENT }} />}
                  {d.toLocaleDateString('fr-FR', { weekday: 'short' })} {d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && <div style={{ height: ROW_H }} />}

          {filtered.map((row) => (
            <div key={row.producerId} style={{ height: ROW_H, boxSizing: 'border-box', display: 'grid', gridTemplateColumns: gridCols, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              {days.map((day, i) => (
                <DayCell key={i} row={row} day={day} onClick={onDayClick ? () => onDayClick(day) : undefined} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourceBoard;
