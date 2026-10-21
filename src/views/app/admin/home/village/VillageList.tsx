// Vue liste du village : une colonne par quartier, rubriques dans l'ordre du
// menu, avec la vignette de chaque bâtiment.
import type { ReactNode } from 'react';
import {
  DISTRICTS,
  SPRITE_META,
  membersOf,
  spriteUrl,
  type DistrictId,
  type SectionId,
} from './villageScene';
import type { SectionData } from './villageModel';
import { AlertFlag } from './VillagePanel';

interface Props {
  sections: Record<
    SectionId,
    { title: string; icon: ReactNode; data: SectionData }
  >;
  selected: SectionId | null;
  district: DistrictId | null;
  dimmed: (id: SectionId) => boolean;
  onSelect: (id: SectionId) => void;
  onDistrict: (id: DistrictId) => void;
  /** Place laissée en haut pour le titre posé par-dessus (0 s'il est au-dessus). */
  top?: number;
}

const Thumb = ({ id }: { id: SectionId }) => {
  const hit = SPRITE_META[id].hit;
  const w = 54;
  const h = 66;
  const k = Math.min(w / hit.w, h / hit.h) * 0.96;
  return (
    <span
      style={{
        width: w,
        height: h,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        display: 'block',
      }}
    >
      <img
        src={spriteUrl(id)}
        alt=""
        loading="lazy"
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

const VillageList = ({
  top = 104,
  sections,
  selected,
  district,
  dimmed,
  onSelect,
  onDistrict,
}: Props) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(196px, 1fr))',
      gap: 14,
      padding: `${top}px 24px 92px`,
    }}
  >
    {DISTRICTS.map((d) => {
      const on = district === d.id;
      return (
        <section
          key={d.id}
          aria-label={`Quartier ${d.name}`}
          style={{
            borderRadius: 20,
            background: d.soft,
            padding: 10,
            opacity: !district || on ? 1 : 0.45,
            transition: 'opacity .3s ease',
          }}
        >
          <button
            type="button"
            onClick={() => onDistrict(d.id)}
            aria-pressed={on}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              width: '100%',
              padding: '6px 6px 10px',
              border: 0,
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: d.hue,
                flexShrink: 0,
              }}
            />
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  color: d.ink,
                }}
              >
                QUARTIER
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#111827',
                }}
              >
                {d.name}
              </span>
              <span
                style={{
                  display: 'block',
                  marginTop: 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: d.ink,
                }}
              >
                {membersOf(d.id).length} bâtiments
              </span>
            </span>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {membersOf(d.id).map((id) => {
              const s = sections[id];
              const isSel = selected === id && !district;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-pressed={isSel}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 84,
                    padding: s.data.badge
                      ? '6px 30px 6px 6px'
                      : '6px 10px 6px 6px',
                    borderRadius: 16,
                    border: isSel
                      ? '2px solid #6d5dfc'
                      : s.data.alert
                        ? '2px solid #ef4444'
                        : '1px solid #ece8e1',
                    background: '#ffffff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    opacity: dimmed(id) ? 0.4 : 1,
                    boxShadow: '0 3px 10px rgba(40,36,80,0.05)',
                  }}
                >
                  <Thumb id={id} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 5,
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: '#111827',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <span
                        style={{ display: 'flex', fontSize: 15, color: d.ink }}
                      >
                        {s.icon}
                      </span>
                      {s.title}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 4,
                        fontSize: 12,
                        lineHeight: 1.3,
                        color: '#6b7280',
                      }}
                    >
                      {s.data.chip}
                    </span>
                    {s.data.alert && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 5,
                          marginTop: 5,
                          fontSize: 11.5,
                          fontWeight: 700,
                          lineHeight: 1.3,
                          color: '#b91c1c',
                        }}
                      >
                        <span style={{ display: 'flex', paddingTop: 1 }}>
                          <AlertFlag size={12} />
                        </span>
                        {s.data.alert}
                      </span>
                    )}
                  </span>
                  {s.data.badge && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        minWidth: 20,
                        height: 20,
                        padding: '0 6px',
                        boxSizing: 'border-box',
                        borderRadius: 999,
                        background: s.data.tone,
                        color: '#ffffff',
                        fontSize: 11.5,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {s.data.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      );
    })}
  </div>
);

export default VillageList;
