import { Droppable } from 'react-beautiful-dnd';
import { Field } from '../types';
import FieldCard from './FieldCard';

type Props = {
  fields: Field[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function Canvas({
  fields,
  selectedId,
  onSelect,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <Droppable droppableId="canvas">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          style={{
            minHeight: '360px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: snapshot.isDraggingOver ? '12px' : '0',
            borderRadius: '14px',
            background: snapshot.isDraggingOver
              ? 'rgba(47,111,237,0.04)'
              : 'transparent',
            border: snapshot.isDraggingOver
              ? '1.5px dashed rgba(47,111,237,0.4)'
              : '1.5px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          {fields.length === 0 && !snapshot.isDraggingOver && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '320px',
                borderRadius: '14px',
                border: '2px dashed rgba(255,255,255,0.07)',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '42px', opacity: 0.08 }}>⊕</div>
              <p
                style={{
                  color: 'rgba(255,255,255,0.18)',
                  fontSize: '13px',
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}
              >
                Glissez un champ depuis la palette
                <br />
                ou cliquez dessus pour l'ajouter
              </p>
            </div>
          )}

          {fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              index={index}
              isSelected={selectedId === field.id}
              onSelect={() => onSelect(field.id)}
              onDuplicate={() => onDuplicate(field.id)}
              onDelete={() => onDelete(field.id)}
            />
          ))}

          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
