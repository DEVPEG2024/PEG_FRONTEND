import { useState, useCallback } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import { AiOutlineSave } from 'react-icons/ai';
import { HiOutlineEye, HiX } from 'react-icons/hi';

import { Field, BannerConfig, FormStructure, FieldWidth } from './types';
import { getFieldDef, FIELD_DEFS } from './fieldDefs';
import { JSONValue } from '@/@types/form';

import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import BannerSection from './components/BannerSection';
import PreviewModal from './components/PreviewModal';

// ── Helpers ───────────────────────────────────────────────────────────────────

const genId = (type: string) =>
  `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const makeField = (type: string): Field => {
  const def = getFieldDef(type);
  const field: Field = {
    id: genId(type),
    type,
    label: def.label,
    required: false,
    width: 100 as FieldWidth,
  };
  if (['select', 'radio', 'checkboxgroup'].includes(type)) {
    field.options = [
      { label: 'Option 1', value: 'option1' },
      { label: 'Option 2', value: 'option2' },
    ];
  }
  if (type === 'columns') field.columns = 2;
  if (type === 'panel') field.panelTitle = 'Panneau';
  if (type === 'table') { field.rows = 3; field.cols = 3; }
  if (type === 'tabs') field.tabs = ['Onglet 1', 'Onglet 2'];
  return field;
};

const parseStructure = (raw: JSONValue): FormStructure => {
  if (!raw) return { fields: [] };
  try {
    const parsed: any = typeof raw === 'string' ? JSON.parse(raw) : raw;
    // New format: { banner?, fields[] }
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.fields)) {
      return {
        banner: parsed.banner,
        fields: parsed.fields.map((f: any) => ({
          ...f,
          id: f.id ?? genId(f.type ?? 'textfield'),
          width: f.width ?? 100,
          required: f.required ?? false,
        })),
      };
    }
    // Legacy format: array of fields (from old builder)
    if (Array.isArray(parsed)) {
      return {
        fields: parsed.map((f: any) => ({
          ...f,
          id: f.id ?? f.key ?? genId(f.type ?? 'textfield'),
          width: f.width ?? 100,
          required: f.required ?? false,
        })),
      };
    }
  } catch { /**/ }
  return { fields: [] };
};

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  onValidate: (name: string, structure: any) => void;
  onCancel: () => void;
  fields: JSONValue;
  name: string;
};

export default function EditForm({ onValidate, onCancel, fields, name }: Props) {
  const [formName, setFormName] = useState(name);
  const [structure, setStructure] = useState<FormStructure>(() => parseStructure(fields));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { banner = {}, fields: formFields } = structure;
  const selectedField = formFields.find((f) => f.id === selectedId) ?? null;

  // ── Mutations ───────────────────────────────────────────────────────────────

  const setFields = useCallback(
    (fn: (prev: Field[]) => Field[]) =>
      setStructure((s) => ({ ...s, fields: fn(s.fields) })),
    []
  );

  const setBanner = useCallback(
    (b: BannerConfig) => setStructure((s) => ({ ...s, banner: b })),
    []
  );

  const addField = (type: string) => {
    const field = makeField(type);
    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  };

  const duplicateField = (id: string) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const clone: Field = { ...prev[idx], id: genId(prev[idx].type) };
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)];
    });
  };

  const deleteField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateField = (id: string, patch: Partial<Field>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Drop from palette → canvas
    if (
      draggableId.startsWith('palette__') &&
      destination.droppableId === 'canvas'
    ) {
      const type = draggableId.replace('palette__', '');
      const field = makeField(type);
      setFields((prev) => {
        const next = [...prev];
        next.splice(destination.index, 0, field);
        return next;
      });
      setSelectedId(field.id);
      return;
    }

    // Reorder within canvas
    if (
      source.droppableId === 'canvas' &&
      destination.droppableId === 'canvas' &&
      source.index !== destination.index
    ) {
      setFields((prev) => {
        const next = [...prev];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        return next;
      });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        fontFamily: 'Inter, sans-serif',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#080f1a',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '11px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
          background: 'rgba(7,13,24,0.98)',
        }}
      >
        {/* Form name */}
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Nom du formulaire…"
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '9px',
            padding: '8px 14px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(47,111,237,0.5)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />

        {/* Field count badge */}
        <span
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {formFields.length} champ{formFields.length !== 1 ? 's' : ''}
        </span>

        {/* Preview */}
        <button
          onClick={() => setShowPreview(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '9px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
          }}
        >
          <HiOutlineEye size={15} /> Aperçu
        </button>

        {/* Save */}
        <button
          onClick={() => onValidate(formName, structure)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 18px',
            background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            border: 'none',
            borderRadius: '9px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(47,111,237,0.38)',
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
          }}
        >
          <AiOutlineSave size={15} /> Enregistrer
        </button>

        {/* Close */}
        <button
          onClick={onCancel}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '9px',
            color: 'rgba(255,255,255,0.45)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
            e.currentTarget.style.color = '#f87171';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          <HiX size={16} />
        </button>
      </div>

      {/* ── Body ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: palette */}
          <Sidebar onAddField={addField} />

          {/* Center: banner + canvas */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: 'rgba(10,18,30,0.96)',
            }}
          >
            <BannerSection banner={banner} onChange={setBanner} />
            <Canvas
              fields={formFields}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDuplicate={duplicateField}
              onDelete={deleteField}
            />
          </div>

          {/* Right: properties or empty state */}
          {selectedField ? (
            <PropertiesPanel
              field={selectedField}
              onChange={(patch) => updateField(selectedField.id, patch)}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <EmptyPanel />
          )}
        </div>
      </DragDropContext>

      {/* Preview modal */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        structure={structure}
        formName={formName}
      />
    </div>
  );
}

function EmptyPanel() {
  return (
    <div
      style={{
        width: '272px',
        background: 'rgba(7,13,24,0.98)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        gap: '10px',
      }}
    >
      <div style={{ fontSize: '38px', opacity: 0.07 }}>⚙</div>
      <p
        style={{
          color: 'rgba(255,255,255,0.18)',
          fontSize: '12px',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Sélectionnez un champ
        <br />
        pour modifier ses propriétés
      </p>
      <p style={{ color: 'rgba(255,255,255,0.1)', fontSize: '11px' }}>
        ou glissez-en un depuis la palette
      </p>
    </div>
  );
}

// Ensure FIELD_DEFS is used (tree-shaking guard)
void FIELD_DEFS;
