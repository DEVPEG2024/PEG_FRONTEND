import { useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import {
  HiX,
  HiTrash,
  HiChevronDown,
  HiChevronUp,
  HiPlus,
} from 'react-icons/hi';
import { MdDragIndicator } from 'react-icons/md';
import { AiOutlineSave } from 'react-icons/ai';
import { JSONValue } from '@/@types/form';

// ─── Palette ────────────────────────────────────────────────────────────────

type PaletteDef = { type: string; label: string; icon: string; color: string };

const PALETTE: PaletteDef[] = [
  { type: 'textfield',   label: 'Texte',           icon: 'T',  color: '#6b9eff' },
  { type: 'textarea',    label: 'Long texte',       icon: '¶',  color: '#a78bfa' },
  { type: 'number',      label: 'Nombre',           icon: '#',  color: '#34d399' },
  { type: 'email',       label: 'Email',            icon: '@',  color: '#fb923c' },
  { type: 'phoneNumber', label: 'Téléphone',        icon: '☎',  color: '#38bdf8' },
  { type: 'checkbox',    label: 'Case à cocher',    icon: '✓',  color: '#4ade80' },
  { type: 'select',      label: 'Liste',            icon: '▾',  color: '#fbbf24' },
  { type: 'radio',       label: 'Boutons radio',    icon: '◉',  color: '#f472b6' },
  { type: 'datetime',    label: 'Date / Heure',     icon: '⊙',  color: '#22d3ee' },
  { type: 'file',        label: 'Fichier',          icon: '↑',  color: '#a3e635' },
];

// ─── Field type ─────────────────────────────────────────────────────────────

type Option = { label: string; value: string };
type Field = {
  type: string;
  key: string;
  label: string;
  placeholder?: string;
  input: boolean;
  required: boolean;
  values?: Option[];
  [k: string]: any;
};

const genKey = (type: string) =>
  type + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);

const makeDefault = (type: string): Field => {
  const base: Field = { type, key: genKey(type), label: PALETTE.find(p => p.type === type)?.label ?? type, input: true, required: false };
  if (type !== 'checkbox') base.placeholder = '';
  if (type === 'select' || type === 'radio') {
    base.values = [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' },
    ];
  }
  if (type === 'file') { base.storage = 'url'; base.fileKey = 'file'; }
  return base;
};

const parseFields = (raw: JSONValue): Field[] => {
  if (Array.isArray(raw)) return raw as Field[];
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
  return [];
};

const getPaletteDef = (type: string) => PALETTE.find(p => p.type === type) ?? PALETTE[0];

// ─── Shared styles ───────────────────────────────────────────────────────────

const miniInput: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '12px',
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
};

// ─── Component ──────────────────────────────────────────────────────────────

function EditForm({
  onValidate,
  onCancel,
  fields,
  name,
}: {
  onValidate: (name: string, components: any) => void;
  onCancel: () => void;
  fields: JSONValue;
  name: string;
}) {
  const [formName, setFormName] = useState(name);
  const [components, setComponents] = useState<Field[]>(parseFields(fields));
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // ── DnD ───────────────────────────────────────────────────────────────────

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (source.droppableId === 'palette' && destination.droppableId === 'canvas') {
      const newField = makeDefault(draggableId);
      setComponents(prev => {
        const next = [...prev];
        next.splice(destination.index, 0, newField);
        return next;
      });
      setExpandedKey(newField.key);
    } else if (source.droppableId === 'canvas' && destination.droppableId === 'canvas') {
      if (source.index === destination.index) return;
      setComponents(prev => {
        const next = [...prev];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        return next;
      });
    }
  };

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addField = (type: string) => {
    const f = makeDefault(type);
    setComponents(prev => [...prev, f]);
    setExpandedKey(f.key);
  };

  const removeField = (key: string) => {
    setComponents(prev => prev.filter(f => f.key !== key));
    if (expandedKey === key) setExpandedKey(null);
  };

  const updateField = (key: string, patch: Partial<Field>) =>
    setComponents(prev => prev.map(f => f.key === key ? { ...f, ...patch } : f));

  const addOption = (key: string, field: Field) => {
    const n = (field.values?.length ?? 0) + 1;
    updateField(key, { values: [...(field.values ?? []), { label: `Option ${n}`, value: `option${n}` }] });
  };

  const updateOption = (key: string, field: Field, i: number, label: string) => {
    const vals = [...(field.values ?? [])];
    vals[i] = { label, value: label.toLowerCase().replace(/\s+/g, '_') };
    updateField(key, { values: vals });
  };

  const removeOption = (key: string, field: Field, i: number) =>
    updateField(key, { values: (field.values ?? []).filter((_, idx) => idx !== i) });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', height: '100%', display: 'flex', flexDirection: 'column', background: '#0c1624' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
            placeholder="Nom du formulaire…"
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '9px 14px', color: '#fff', fontSize: '14px', fontWeight: 600, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
          />
        </div>
        <button onClick={() => onValidate(formName, components)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
          <AiOutlineSave size={15} /> Enregistrer
        </button>
        <button onClick={onCancel}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', flexShrink: 0 }}>
          <HiX size={16} />
        </button>
      </div>

      {/* ── Body ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── Left palette ── */}
          <div style={{ width: '210px', background: 'rgba(10,18,30,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '16px 10px', overflowY: 'auto', flexShrink: 0 }}>
            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px', padding: '0 4px' }}>Composants</p>
            <Droppable droppableId="palette" isDropDisabled>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {PALETTE.map((item, index) => (
                    <Draggable key={item.type} draggableId={item.type} index={index}>
                      {(provided, snapshot) => (
                        <>
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => addField(item.type)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '9px',
                              padding: '8px 10px', borderRadius: '9px', cursor: 'grab',
                              background: snapshot.isDragging ? 'rgba(47,111,237,0.18)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${snapshot.isDragging ? 'rgba(47,111,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
                              userSelect: 'none', transition: 'all 0.12s',
                              ...provided.draggableProps.style,
                            }}
                            onMouseEnter={(e) => { if (!snapshot.isDragging) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; } }}
                            onMouseLeave={(e) => { if (!snapshot.isDragging) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; } }}
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: item.color + '20', border: `1px solid ${item.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', color: item.color, fontWeight: 700 }}>
                              {item.icon}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', flex: 1 }}>{item.label}</span>
                            <HiPlus size={11} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                          </div>
                          {/* Ghost clone stays in palette while dragging */}
                          {snapshot.isDragging && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '9px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', opacity: 0.5 }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: item.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: item.color, fontWeight: 700 }}>{item.icon}</div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                            </div>
                          )}
                        </>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* ── Right canvas ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: 'rgba(12,22,36,0.98)' }}>
            <Droppable droppableId="canvas">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minHeight: '300px',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    padding: snapshot.isDraggingOver ? '10px' : '0',
                    borderRadius: '14px',
                    background: snapshot.isDraggingOver ? 'rgba(47,111,237,0.04)' : 'transparent',
                    border: snapshot.isDraggingOver ? '1.5px dashed rgba(47,111,237,0.35)' : '1.5px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {components.length === 0 && !snapshot.isDraggingOver && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', borderRadius: '14px', border: '2px dashed rgba(255,255,255,0.1)', gap: '10px' }}>
                      <div style={{ fontSize: '36px', opacity: 0.15 }}>⊕</div>
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center' }}>Glissez un composant ici<br />ou cliquez dessus dans la palette</p>
                    </div>
                  )}

                  {components.map((field, index) => {
                    const def = getPaletteDef(field.type);
                    const isOpen = expandedKey === field.key;
                    const hasOptions = field.type === 'select' || field.type === 'radio';

                    return (
                      <Draggable key={field.key} draggableId={field.key} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              borderRadius: '12px', overflow: 'hidden',
                              background: isOpen ? 'rgba(47,111,237,0.07)' : 'rgba(255,255,255,0.03)',
                              border: `1.5px solid ${snapshot.isDragging ? 'rgba(47,111,237,0.6)' : isOpen ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                              boxShadow: snapshot.isDragging ? '0 12px 32px rgba(0,0,0,0.5)' : 'none',
                              transition: 'border-color 0.15s',
                              ...provided.draggableProps.style,
                            }}
                          >
                            {/* Row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px' }}>
                              <div {...provided.dragHandleProps} style={{ color: 'rgba(255,255,255,0.2)', cursor: 'grab', display: 'flex', flexShrink: 0 }}>
                                <MdDragIndicator size={18} />
                              </div>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: def.color + '20', border: `1px solid ${def.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', color: def.color, fontWeight: 700 }}>
                                {def.icon}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: '#fff', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{field.label || 'Sans titre'}</div>
                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                                  {def.label}{field.required ? ' · Requis' : ''}
                                  {hasOptions && field.values ? ` · ${field.values.length} option${field.values.length > 1 ? 's' : ''}` : ''}
                                </div>
                              </div>
                              <button onClick={() => setExpandedKey(isOpen ? null : field.key)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isOpen ? '#6b9eff' : 'rgba(255,255,255,0.35)', display: 'flex', padding: '4px', flexShrink: 0 }}>
                                {isOpen ? <HiChevronUp size={16} /> : <HiChevronDown size={16} />}
                              </button>
                              <button onClick={() => removeField(field.key)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', display: 'flex', padding: '4px', flexShrink: 0, transition: 'color 0.15s' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(239,68,68,0.5)')}>
                                <HiTrash size={14} />
                              </button>
                            </div>

                            {/* Expanded edit panel */}
                            {isOpen && (
                              <div style={{ padding: '14px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                {/* Label + Placeholder */}
                                <div style={{ display: 'grid', gridTemplateColumns: field.type !== 'checkbox' && field.type !== 'file' && !hasOptions ? '1fr 1fr' : '1fr', gap: '10px' }}>
                                  <div>
                                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, marginBottom: '5px' }}>Libellé</label>
                                    <input type="text" value={field.label}
                                      onChange={(e) => updateField(field.key, { label: e.target.value })}
                                      style={miniInput}
                                      onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
                                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                                    />
                                  </div>
                                  {field.type !== 'checkbox' && field.type !== 'file' && !hasOptions && (
                                    <div>
                                      <label style={{ display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, marginBottom: '5px' }}>Placeholder</label>
                                      <input type="text" value={field.placeholder ?? ''}
                                        onChange={(e) => updateField(field.key, { placeholder: e.target.value })}
                                        style={miniInput}
                                        onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
                                        onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Required toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <button type="button" onClick={() => updateField(field.key, { required: !field.required })}
                                    style={{ width: '34px', height: '19px', borderRadius: '100px', background: field.required ? '#22c55e' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                                    <span style={{ position: 'absolute', top: '1.5px', left: field.required ? '16px' : '1.5px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                                  </button>
                                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600 }}>Champ requis</span>
                                </div>

                                {/* Options for select / radio */}
                                {hasOptions && (
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600 }}>Options</label>
                                      <button type="button" onClick={() => addOption(field.key, field)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.3)', borderRadius: '6px', padding: '3px 9px', color: '#6b9eff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                                        <HiPlus size={11} /> Ajouter
                                      </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {(field.values ?? []).map((opt, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          <input type="text" value={opt.label}
                                            onChange={(e) => updateOption(field.key, field, i, e.target.value)}
                                            style={{ ...miniInput, flex: 1 }}
                                            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
                                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                                          />
                                          <button type="button" onClick={() => removeOption(field.key, field, i)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', padding: '4px', display: 'flex', flexShrink: 0 }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(239,68,68,0.5)')}>
                                            <HiX size={13} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

export default EditForm;
