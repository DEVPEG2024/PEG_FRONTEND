// Fiche à droite du village : un quartier, un projet ou une rubrique.
// Affichage seul — AdminVillage choisit le contenu et reçoit les clics.
import type { ReactNode } from 'react';
import { HiCheck, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import { BsCalendar3 } from 'react-icons/bs';
import type { District, SectionId } from './villageScene';
import { spriteUrl, SPRITE_META } from './villageScene';
import {
  TONE,
  type ActivityInfo,
  type ProjectCard,
  type SectionData,
  type Trend,
} from './villageModel';

const TREND_TONE: Record<Trend['tone'], { bg: string; fg: string }> = {
  good: { bg: '#e8f7ee', fg: '#15803d' },
  bad: { bg: '#fde8e8', fg: '#b91c1c' },
  neutral: { bg: '#eceef3', fg: '#4b5563' },
};

/** Jauge d'activité du mois : trois barres, dorées quand c'est exceptionnel. */
const ActivityBlock = ({ a }: { a: ActivityInfo }) => {
  const color =
    a.level === 3
      ? '#f2b705'
      : a.level === 2
        ? '#16a34a'
        : a.level === 1
          ? '#6d5dfc'
          : '#9ca3af';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginTop: 14,
        padding: '10px 13px',
        borderRadius: 14,
        background: a.level === 3 ? '#fff7e0' : '#f6f5f9',
        border: a.level === 3 ? '1px solid #f6d77a' : '1px solid transparent',
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 22 }}
      >
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            style={{
              width: 6,
              height: 8 + n * 4.5,
              borderRadius: 3,
              background: a.level >= n ? color : '#dcdde3',
            }}
          />
        ))}
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 12.5,
            fontWeight: 700,
            color: a.level === 3 ? '#a16207' : '#6b7280',
          }}
        >
          Activité du mois · {a.label}
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 1,
            fontSize: 13.5,
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {a.text}
        </span>
      </span>
    </div>
  );
};

/** Petit drapeau rouge, le même que sur la carte. */
export const AlertFlag = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <rect x="2" y="2" width="2" height="15" rx="1" fill="#7f1d1d" />
    <path d="M4 3 L16 7.5 L4 12 Z" fill="#ef4444" />
  </svg>
);

const CHIP: Record<
  ProjectCard['chipTone'],
  { bg: string; fg: string; dot: string }
> = {
  bat: { bg: '#eeebff', fg: '#4f3fd1', dot: TONE.violet },
  late: { bg: '#fde8e8', fg: '#b91c1c', dot: TONE.red },
  production: { bg: '#fff1e6', fg: '#c2410c', dot: TONE.orange },
  paid: { bg: '#e6f7f4', fg: '#0f766e', dot: '#2dd4bf' },
  waiting: { bg: '#f3f4f6', fg: '#4b5563', dot: TONE.grey },
};

const sectionChip = (d: SectionData) => {
  if (!d.badge) return { bg: '#f3f4f6', fg: '#4b5563' };
  if (d.tone === TONE.orange || d.tone === TONE.red)
    return { bg: '#fff1e6', fg: '#c2410c' };
  if (d.tone === TONE.amber) return { bg: '#fff6e0', fg: '#a16207' };
  if (d.tone === TONE.green) return { bg: '#e8f7ee', fg: '#15803d' };
  return { bg: '#eeebff', fg: '#4f3fd1' };
};

/** Vignette d'un bâtiment : son cadre cliquable ajusté dans la boîte. */
const BuildingThumb = ({
  id,
  w,
  h,
  bg,
}: {
  id: SectionId;
  w: number;
  h: number;
  bg: string;
}) => {
  const hit = SPRITE_META[id].hit;
  const k = Math.min(w / hit.w, h / hit.h) * 0.96;
  return (
    <span
      style={{
        width: w,
        height: h,
        flexShrink: 0,
        borderRadius: 16,
        background: bg,
        overflow: 'hidden',
        position: 'relative',
        display: 'block',
      }}
    >
      <img
        src={spriteUrl(id)}
        alt=""
        style={{
          position: 'absolute',
          left: (w - hit.w * k) / 2 - hit.x * k,
          top: (h - hit.h * k) / 2 - hit.y * k,
          width: 400 * k,
          height: 400 * k,
          maxWidth: 'none',
        }}
      />
    </span>
  );
};

const Primary = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      height: 50,
      borderRadius: 14,
      border: 0,
      background: '#6d5dfc',
      color: '#ffffff',
      fontSize: 15.5,
      fontWeight: 800,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      cursor: 'pointer',
      width: '100%',
    }}
  >
    {children}
    <HiChevronRight aria-hidden="true" />
  </button>
);

const Secondary = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      height: 50,
      borderRadius: 14,
      border: '1.5px solid #d6d3dd',
      background: '#ffffff',
      color: '#111827',
      fontSize: 15.5,
      fontWeight: 700,
      cursor: 'pointer',
      width: '100%',
    }}
  >
    {children}
  </button>
);

const Stat = ({
  label,
  value,
  color,
  trend,
}: {
  label: string;
  value: string;
  color?: string;
  trend?: Trend;
}) => (
  <div
    style={{ padding: '11px 13px', borderRadius: 14, background: '#f6f5f9' }}
  >
    <span style={{ display: 'block', fontSize: 12.5, color: '#6b7280' }}>
      {label}
    </span>
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 3,
      }}
    >
      <span
        style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          color: color ?? '#111827',
        }}
      >
        {value}
      </span>
      {trend && (
        <span
          title={`Évolution ${trend.since}`}
          aria-label={`${trend.text} ${trend.since}`}
          style={{
            padding: '1px 6px',
            borderRadius: 999,
            background: TREND_TONE[trend.tone].bg,
            color: TREND_TONE[trend.tone].fg,
            fontSize: 11.5,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {trend.delta > 0 ? '▲' : '▼'} {trend.text}
        </span>
      )}
    </span>
  </div>
);

export interface PanelSection {
  id: SectionId;
  title: string;
  sub: string;
  icon: ReactNode;
  cta: string;
  data: SectionData;
  district: District;
}

interface Props {
  loading: boolean;
  district: { d: District; members: PanelSection[] } | null;
  project: ProjectCard | null;
  fromSection: boolean;
  section: PanelSection | null;
  onSelect: (id: SectionId) => void;
  onOpenProject: (documentId: string) => void;
  onProjectPage: (documentId: string) => void;
  onDistrict: (id: District['id']) => void;
  onShowAll: () => void;
  onBack: () => void;
  onCta: (id: SectionId) => void;
  onNavigate: (to: string) => void;
}

const VillagePanel = ({
  loading,
  district,
  project,
  fromSection,
  section,
  onSelect,
  onOpenProject,
  onProjectPage,
  onDistrict,
  onShowAll,
  onBack,
  onCta,
  onNavigate,
}: Props) => {
  // ── Quartier ──
  if (district) {
    const { d, members } = district;
    const attention = members.filter((m) => m.data.attention).length;
    const urgent = members.filter((m) => m.data.alert).length;
    return (
      <>
        <span
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 30,
            padding: '0 12px',
            borderRadius: 9,
            background: d.soft,
            color: d.ink,
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: d.hue,
            }}
          />
          Quartier · {members.length} bâtiments
        </span>
        <h2
          style={{
            margin: '14px 0 0',
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            lineHeight: 1.12,
            color: '#111827',
          }}
        >
          {d.place}
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 16,
            fontWeight: 700,
            color: d.ink,
          }}
        >
          {d.name}
        </p>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 14.5,
            lineHeight: 1.5,
            color: '#4b5563',
          }}
        >
          {d.desc}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
            marginTop: 16,
          }}
        >
          <Stat
            label="Urgent"
            value={
              loading
                ? '…'
                : urgent
                  ? `${urgent} alerte${urgent > 1 ? 's' : ''}`
                  : 'Aucune'
            }
            color={urgent ? '#b91c1c' : '#15803d'}
          />
          <Stat
            label="À traiter"
            value={
              loading
                ? '…'
                : attention
                  ? `${attention} rubrique${attention > 1 ? 's' : ''}`
                  : 'Rien'
            }
            color={attention ? '#c2410c' : '#15803d'}
          />
        </div>
        <h3
          style={{
            margin: '18px 0 6px',
            fontSize: 15.5,
            fontWeight: 800,
            color: '#111827',
          }}
        >
          Dans ce quartier
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {members.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 50,
                padding: '6px 4px',
                border: 0,
                borderTop: i ? '1px solid #f0ede7' : 0,
                background: 'transparent',
                color: '#111827',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  borderRadius: 11,
                  background: d.soft,
                  color: d.ink,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 19,
                }}
              >
                {m.icon}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{ display: 'block', fontSize: 14.5, fontWeight: 800 }}
                >
                  {m.title}
                </span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 2,
                    fontSize: 12.5,
                    fontWeight: m.data.alert ? 700 : 400,
                    color: m.data.alert ? '#b91c1c' : '#6b7280',
                  }}
                >
                  {m.data.alert && <AlertFlag size={12} />}
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.data.alert ?? m.data.chip}
                  </span>
                </span>
              </span>
              {m.data.badge && (
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    padding: '0 6px',
                    boxSizing: 'border-box',
                    borderRadius: 999,
                    background: m.data.tone,
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {m.data.badge}
                </span>
              )}
              <HiChevronRight aria-hidden="true" style={{ color: '#9ca3af' }} />
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <Secondary onClick={onShowAll}>Voir tout le village</Secondary>
        </div>
      </>
    );
  }

  // ── Projet ──
  if (project) {
    const chip = CHIP[project.chipTone];
    return (
      <>
        {fromSection && (
          <button
            type="button"
            onClick={onBack}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 30,
              margin: '-6px 0 8px -8px',
              padding: '0 10px',
              border: 0,
              borderRadius: 10,
              background: 'transparent',
              color: '#5b4ae8',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <HiChevronLeft aria-hidden="true" /> Projets
          </button>
        )}
        <span
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 30,
            padding: '0 12px',
            borderRadius: 9,
            background: chip.bg,
            color: chip.fg,
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: chip.dot,
            }}
          />
          {project.chip}
        </span>
        <h2
          style={{
            margin: '14px 0 0',
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            color: '#111827',
          }}
        >
          {project.name}
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 15.5,
            fontWeight: 600,
            color: '#6b7280',
          }}
        >
          {project.customer}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 16,
          }}
        >
          {project.imageUrl ? (
            <span
              style={{
                width: 104,
                height: 96,
                flexShrink: 0,
                borderRadius: 16,
                background: '#f4f2ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={project.imageUrl}
                alt=""
                style={{
                  maxWidth: '88%',
                  maxHeight: '88%',
                  objectFit: 'contain',
                  mixBlendMode: 'multiply',
                }}
              />
            </span>
          ) : (
            <BuildingThumb id="projets" w={104} h={96} bg="#efecfe" />
          )}
          <span style={{ fontSize: 14, lineHeight: 1.45, color: '#4b5563' }}>
            {project.detail}
          </span>
        </div>
        <span
          style={{
            display: 'block',
            height: 1,
            background: '#ece8e1',
            margin: '18px 0 14px',
          }}
        />
        <h3
          style={{
            margin: '0 0 12px',
            fontSize: 15.5,
            fontWeight: 800,
            color: '#111827',
          }}
        >
          Avancement
        </h3>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {project.steps.map((s, i) => {
            const col = s.state === 'late' ? TONE.red : TONE.violet;
            const last = i === project.steps.length - 1;
            return (
              <li
                key={s.title}
                style={{ display: 'flex', gap: 13, minHeight: last ? 0 : 54 }}
              >
                <span
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 26,
                    flexShrink: 0,
                  }}
                >
                  {s.state === 'done' ? (
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: TONE.violet,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HiCheck aria-hidden="true" />
                    </span>
                  ) : s.state === 'todo' ? (
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        boxSizing: 'border-box',
                        borderRadius: '50%',
                        border: '3px solid #e5e7eb',
                        background: '#fff',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        boxSizing: 'border-box',
                        borderRadius: '50%',
                        border: `3px solid ${col}`,
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          background: col,
                        }}
                      />
                    </span>
                  )}
                  {!last && (
                    <span
                      style={{
                        flex: 1,
                        width: 2,
                        minHeight: 18,
                        margin: '4px 0',
                        background:
                          s.state === 'done' ? TONE.violet : '#e5e7eb',
                      }}
                    />
                  )}
                </span>
                <span style={{ paddingTop: 3 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 14.5,
                      fontWeight: 700,
                      color:
                        s.state === 'current' || s.state === 'late'
                          ? col
                          : '#111827',
                    }}
                  >
                    {s.title}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 2,
                      fontSize: 13,
                      color: s.state === 'late' ? '#b91c1c' : '#6b7280',
                    }}
                  >
                    {s.sub}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '14px 18px',
            borderRadius: 16,
            background: '#f4f4f7',
            marginTop: 14,
          }}
        >
          <BsCalendar3
            aria-hidden="true"
            style={{ fontSize: 24, color: TONE.violet }}
          />
          <span>
            <span style={{ display: 'block', fontSize: 13, color: '#6b7280' }}>
              {project.dateLabel}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 2,
                fontSize: 21,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: project.late ? '#b91c1c' : '#111827',
              }}
            >
              {project.date}
            </span>
          </span>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <Primary onClick={() => onProjectPage(project.documentId)}>
            Ouvrir le projet
          </Primary>
        </div>
      </>
    );
  }

  // ── Rubrique ──
  if (!section) return null;
  const { data, district: d } = section;
  const chip = sectionChip(data);
  return (
    <>
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 30,
            padding: '0 12px',
            borderRadius: 9,
            background: chip.bg,
            color: chip.fg,
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          <span style={{ display: 'flex', fontSize: 16 }}>{section.icon}</span>
          {loading ? 'Chargement…' : data.chip}
        </span>
        <button
          type="button"
          onClick={() => onDistrict(d.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            height: 30,
            padding: '0 12px',
            border: 0,
            borderRadius: 9,
            background: d.soft,
            color: d.ink,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: d.hue,
            }}
          />
          {d.place}
        </button>
      </span>
      <h2
        style={{
          margin: '14px 0 0',
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.025em',
          lineHeight: 1.12,
          color: '#111827',
        }}
      >
        {section.title}
      </h2>
      {section.sub && (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 14.5,
            lineHeight: 1.45,
            fontWeight: 600,
            color: '#6b7280',
          }}
        >
          {section.sub}
        </p>
      )}
      {data.alert && (
        <p
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 9,
            margin: '14px 0 0',
            padding: '10px 12px',
            borderRadius: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          <span style={{ display: 'flex', paddingTop: 2 }}>
            <AlertFlag size={15} />
          </span>
          {data.alert}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginTop: 16,
        }}
      >
        <BuildingThumb id={section.id} w={112} h={104} bg={d.soft} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.4,
            color: '#111827',
          }}
        >
          {loading ? 'Chargement des données…' : data.lead}
        </span>
      </div>
      {data.stats.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 10,
            marginTop: 16,
          }}
        >
          {data.stats.map((s) => (
            <Stat
              key={s.label}
              label={s.label}
              value={s.value}
              trend={s.trend}
            />
          ))}
        </div>
      )}
      {!loading && data.activity && <ActivityBlock a={data.activity} />}
      {data.items.length > 0 && (
        <>
          <h3
            style={{
              margin: '18px 0 4px',
              fontSize: 15.5,
              fontWeight: 800,
              color: '#111827',
            }}
          >
            En ce moment
          </h3>
          {data.items.map((it, i) => {
            const go = it.projectId
              ? () => onOpenProject(it.projectId as string)
              : it.to
                ? () => onNavigate(it.to as string)
                : undefined;
            return (
              <button
                key={`${it.title}-${i}`}
                type="button"
                onClick={go}
                disabled={!go}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 50,
                  padding: '6px 4px',
                  border: 0,
                  borderTop: i ? '1px solid #f0ede7' : 0,
                  background: 'transparent',
                  color: '#111827',
                  textAlign: 'left',
                  cursor: go ? 'pointer' : 'default',
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    flexShrink: 0,
                    borderRadius: '50%',
                    background: it.dot,
                  }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.title}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 2,
                      fontSize: 12.5,
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.meta}
                  </span>
                </span>
                {go && (
                  <HiChevronRight
                    aria-hidden="true"
                    style={{ color: '#9ca3af' }}
                  />
                )}
              </button>
            );
          })}
        </>
      )}
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <Primary onClick={() => onCta(section.id)}>{section.cta}</Primary>
      </div>
    </>
  );
};

export default VillagePanel;
