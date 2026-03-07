import { useState } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { FIELD_DEFS, CATEGORY_LABELS } from '../fieldDefs';
import { FieldCategory, FieldDef } from '../types';
import { HiPlus, HiOutlineSearch } from 'react-icons/hi';

type Props = {
  onAddField: (type: string) => void;
};

export default function Sidebar({ onAddField }: Props) {
  const [search, setSearch] = useState('');
  const categories: FieldCategory[] = ['basic', 'advanced', 'layout'];
  const filtered = search
    ? FIELD_DEFS.filter((d) =>
        d.label.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div
      style={{
        width: '216px',
        background: 'rgba(7,13,24,0.98)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Search */}
      <div style={{ padding: '12px 10px 6px' }}>
        <div style={{ position: 'relative' }}>
          <HiOutlineSearch
            size={13}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.25)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Rechercher un champ…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '7px 10px 7px 30px',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 16px' }}>
        {filtered ? (
          <Droppable droppableId="palette-search" isDropDisabled>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '8px' }}
              >
                {filtered.length === 0 && (
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
                    Aucun résultat
                  </p>
                )}
                {filtered.map((def, i) => (
                  <PaletteItem key={def.type} def={def} index={i} onAdd={onAddField} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ) : (
          categories.map((cat) => {
            const items = FIELD_DEFS.filter((d) => d.category === cat);
            return (
              <div key={cat} style={{ marginBottom: '14px' }}>
                <p
                  style={{
                    color: 'rgba(255,255,255,0.22)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    margin: '12px 4px 6px',
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </p>
                <Droppable droppableId={`palette-${cat}`} isDropDisabled>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}
                    >
                      {items.map((def, i) => (
                        <PaletteItem key={def.type} def={def} index={i} onAdd={onAddField} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PaletteItem({
  def,
  index,
  onAdd,
}: {
  def: FieldDef;
  index: number;
  onAdd: (type: string) => void;
}) {
  return (
    <Draggable draggableId={`palette__${def.type}`} index={index}>
      {(provided, snapshot) => (
        <>
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onAdd(def.type)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 8px',
              borderRadius: '8px',
              cursor: 'grab',
              background: snapshot.isDragging
                ? 'rgba(47,111,237,0.2)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${
                snapshot.isDragging
                  ? 'rgba(47,111,237,0.45)'
                  : 'rgba(255,255,255,0.06)'
              }`,
              userSelect: 'none',
              transition: 'background 0.1s, border-color 0.1s',
              ...provided.draggableProps.style,
            }}
            onMouseEnter={(e) => {
              if (!snapshot.isDragging)
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={(e) => {
              if (!snapshot.isDragging)
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: def.color + '22',
                border: `1px solid ${def.color}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '12px',
                color: def.color,
                fontWeight: 700,
              }}
            >
              {def.iconChar}
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.72)',
                flex: 1,
              }}
            >
              {def.label}
            </span>
            <HiPlus size={11} style={{ color: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
          </div>
          {/* Ghost while dragging */}
          {snapshot.isDragging && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 8px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.08)',
                opacity: 0.45,
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: def.color + '18',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: def.color,
                  fontWeight: 700,
                }}
              >
                {def.iconChar}
              </div>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                {def.label}
              </span>
            </div>
          )}
        </>
      )}
    </Draggable>
  );
}
