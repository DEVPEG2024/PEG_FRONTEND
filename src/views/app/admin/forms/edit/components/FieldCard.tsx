import { Draggable } from 'react-beautiful-dnd';
import { Field } from '../types';
import { getFieldDef } from '../fieldDefs';
import { MdDragIndicator } from 'react-icons/md';
import { HiOutlineDuplicate, HiOutlineTrash, HiOutlinePencilAlt } from 'react-icons/hi';

type Props = {
  field: Field;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export default function FieldCard({
  field,
  index,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
}: Props) {
  const def = getFieldDef(field.type);

  return (
    <Draggable draggableId={field.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={onSelect}
          style={{
            borderRadius: '10px',
            overflow: 'hidden',
            background: isSelected
              ? 'rgba(47,111,237,0.09)'
              : 'rgba(255,255,255,0.03)',
            border: `1.5px solid ${
              snapshot.isDragging
                ? 'rgba(47,111,237,0.7)'
                : isSelected
                ? 'rgba(47,111,237,0.45)'
                : 'rgba(255,255,255,0.07)'
            }`,
            boxShadow: snapshot.isDragging
              ? '0 16px 40px rgba(0,0,0,0.55)'
              : 'none',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
            ...provided.draggableProps.style,
          }}
          onMouseEnter={(e) => {
            if (!isSelected && !snapshot.isDragging)
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected && !snapshot.isDragging)
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
            }}
          >
            {/* Drag handle */}
            <div
              {...provided.dragHandleProps}
              style={{
                color: 'rgba(255,255,255,0.2)',
                cursor: 'grab',
                display: 'flex',
                flexShrink: 0,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <MdDragIndicator size={18} />
            </div>

            {/* Icon */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: def.color + '20',
                border: `1px solid ${def.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '13px',
                color: def.color,
                fontWeight: 700,
              }}
            >
              {def.iconChar}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {field.label || 'Sans titre'}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                {def.label}
                {field.required ? ' · Requis' : ''}
                {' · '}{field.width}%
              </div>
            </div>

            {/* Actions */}
            <div
              style={{ display: 'flex', gap: '4px', flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Btn
                onClick={onSelect}
                title="Éditer"
                activeColor="#6b9eff"
                activeBg="rgba(47,111,237,0.18)"
              >
                <HiOutlinePencilAlt size={13} />
              </Btn>
              <Btn
                onClick={onDuplicate}
                title="Dupliquer"
                activeColor="#c084fc"
                activeBg="rgba(168,85,247,0.15)"
              >
                <HiOutlineDuplicate size={13} />
              </Btn>
              <Btn
                onClick={onDelete}
                title="Supprimer"
                activeColor="#f87171"
                activeBg="rgba(239,68,68,0.15)"
              >
                <HiOutlineTrash size={13} />
              </Btn>
            </div>
          </div>

          {/* Width indicator bar */}
          <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)' }}>
            <div
              style={{
                height: '100%',
                width: `${field.width}%`,
                background: isSelected ? def.color + '99' : def.color + '55',
                transition: 'width 0.2s, background 0.15s',
              }}
            />
          </div>
        </div>
      )}
    </Draggable>
  );
}

function Btn({
  onClick,
  title,
  activeColor,
  activeBg,
  children,
}: {
  onClick: () => void;
  title: string;
  activeColor: string;
  activeBg: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '7px',
        background: 'rgba(255,255,255,0.05)',
        border: 'none',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = activeColor;
        e.currentTarget.style.background = activeBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
      }}
    >
      {children}
    </button>
  );
}
