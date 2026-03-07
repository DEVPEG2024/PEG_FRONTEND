import { Field, FieldWidth } from '../types';
import { getFieldDef } from '../fieldDefs';
import { HiOutlineX, HiPlus, HiOutlineTrash } from 'react-icons/hi';

type Props = {
  field: Field;
  onChange: (patch: Partial<Field>) => void;
  onClose: () => void;
};

const WIDTHS: { label: string; value: FieldWidth }[] = [
  { label: '25%', value: 25 },
  { label: '33%', value: 33 },
  { label: '50%', value: 50 },
  { label: '66%', value: 66 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 },
];

const HAS_OPTIONS = ['select', 'radio', 'checkboxgroup'];
const HAS_PLACEHOLDER = [
  'textfield', 'textarea', 'number', 'password',
  'email', 'url', 'phoneNumber', 'currency', 'address',
];
const HAS_DEFAULT = [
  'textfield', 'number', 'email', 'url', 'phoneNumber', 'currency', 'select',
];
const LAYOUT_TYPES = ['content', 'columns', 'panel', 'table', 'tabs'];

export default function PropertiesPanel({ field, onChange, onClose }: Props) {
  const def = getFieldDef(field.type);
  const isLayout = LAYOUT_TYPES.includes(field.type);

  const addOption = () => {
    const n = (field.options?.length ?? 0) + 1;
    onChange({
      options: [
        ...(field.options ?? []),
        { label: `Option ${n}`, value: `option${n}` },
      ],
    });
  };

  const updateOption = (i: number, label: string) => {
    const opts = [...(field.options ?? [])];
    opts[i] = { label, value: label.toLowerCase().replace(/\s+/g, '_') };
    onChange({ options: opts });
  };

  const removeOption = (i: number) => {
    onChange({ options: (field.options ?? []).filter((_, idx) => idx !== i) });
  };

  const updateTab = (i: number, label: string) => {
    const tabs = [...(field.tabs ?? [])];
    tabs[i] = label;
    onChange({ tabs });
  };

  return (
    <div
      style={{
        width: '272px',
        background: 'rgba(7,13,24,0.98)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '13px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          background: 'rgba(7,13,24,0.98)',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: def.color + '20',
            border: `1px solid ${def.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            color: def.color,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {def.iconChar}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '13px', margin: 0 }}>
            {def.label}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', margin: 0 }}>
            Propriétés du champ
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)',
            display: 'flex',
            padding: '4px',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')
          }
        >
          <HiOutlineX size={15} />
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* ── Layout-specific sections ── */}

        {field.type === 'content' && (
          <Section label="Contenu HTML">
            <textarea
              value={field.content ?? ''}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder="<p>Votre contenu HTML…</p>"
              style={{ ...input, height: '110px', resize: 'vertical' }}
            />
          </Section>
        )}

        {field.type === 'columns' && (
          <Section label="Nombre de colonnes">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
              {[2, 3, 4].map((n) => (
                <SegBtn
                  key={n}
                  active={field.columns === n}
                  onClick={() => onChange({ columns: n })}
                >
                  {n} col.
                </SegBtn>
              ))}
            </div>
          </Section>
        )}

        {field.type === 'panel' && (
          <Section label="Titre du panneau">
            <input
              type="text"
              value={field.panelTitle ?? ''}
              onChange={(e) => onChange({ panelTitle: e.target.value })}
              placeholder="Titre du panneau…"
              style={input}
            />
          </Section>
        )}

        {field.type === 'table' && (
          <Section label="Dimensions">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={lbl}>Lignes</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={field.rows ?? 3}
                  onChange={(e) => onChange({ rows: Number(e.target.value) })}
                  style={input}
                />
              </div>
              <div>
                <label style={lbl}>Colonnes</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={field.cols ?? 3}
                  onChange={(e) => onChange({ cols: Number(e.target.value) })}
                  style={input}
                />
              </div>
            </div>
          </Section>
        )}

        {field.type === 'tabs' && (
          <Section label="Onglets">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(field.tabs ?? ['Onglet 1']).map((tab, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={tab}
                    onChange={(e) => updateTab(i, e.target.value)}
                    style={{ ...input, flex: 1 }}
                  />
                  <TrashBtn
                    onClick={() =>
                      onChange({
                        tabs: (field.tabs ?? []).filter((_, idx) => idx !== i),
                      })
                    }
                  />
                </div>
              ))}
              <AddBtn
                onClick={() =>
                  onChange({
                    tabs: [
                      ...(field.tabs ?? []),
                      `Onglet ${(field.tabs?.length ?? 0) + 1}`,
                    ],
                  })
                }
              >
                Ajouter un onglet
              </AddBtn>
            </div>
          </Section>
        )}

        {/* ── Common field sections ── */}

        {!isLayout && field.type !== 'checkbox' && (
          <Section label="Libellé">
            <input
              type="text"
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="Libellé du champ…"
              style={input}
            />
          </Section>
        )}

        {field.type === 'checkbox' && (
          <Section label="Texte de la case">
            <input
              type="text"
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="Texte affiché à côté de la case…"
              style={input}
            />
          </Section>
        )}

        {!isLayout && HAS_PLACEHOLDER.includes(field.type) && (
          <Section label="Placeholder">
            <input
              type="text"
              value={field.placeholder ?? ''}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              placeholder="Texte indicatif…"
              style={input}
            />
          </Section>
        )}

        {!isLayout && (
          <Section label="Description">
            <textarea
              value={field.description ?? ''}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Aide ou explication pour ce champ…"
              style={{ ...input, height: '58px', resize: 'none' }}
            />
          </Section>
        )}

        {!isLayout && HAS_DEFAULT.includes(field.type) && (
          <Section label="Valeur par défaut">
            <input
              type="text"
              value={field.defaultValue ?? ''}
              onChange={(e) => onChange({ defaultValue: e.target.value })}
              placeholder="Valeur initiale…"
              style={input}
            />
          </Section>
        )}

        {/* ── Options ── */}
        {HAS_OPTIONS.includes(field.type) && (
          <Section label="Options">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(field.options ?? []).map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateOption(i, e.target.value)}
                    style={{ ...input, flex: 1 }}
                  />
                  <TrashBtn onClick={() => removeOption(i)} />
                </div>
              ))}
              <AddBtn onClick={addOption}>Ajouter une option</AddBtn>
            </div>
          </Section>
        )}

        {/* ── Width ── */}
        {field.type !== 'content' && (
          <Section label="Largeur du champ">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '5px' }}>
              {WIDTHS.map(({ label, value }) => (
                <SegBtn
                  key={value}
                  active={field.width === value}
                  onClick={() => onChange({ width: value })}
                >
                  {label}
                </SegBtn>
              ))}
            </div>
          </Section>
        )}

        {/* ── Required toggle ── */}
        {!isLayout && (
          <Section label="Validation">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Toggle
                value={field.required}
                onChange={(v) => onChange({ required: v })}
              />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                Champ obligatoire
              </span>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '100px',
        background: value ? '#22c55e' : 'rgba(255,255,255,0.12)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: value ? '18px' : '2px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          display: 'block',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 4px',
        borderRadius: '7px',
        border: `1px solid ${active ? 'rgba(47,111,237,0.55)' : 'rgba(255,255,255,0.1)'}`,
        background: active ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.04)',
        color: active ? '#6b9eff' : 'rgba(255,255,255,0.45)',
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  );
}

function AddBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(47,111,237,0.1)',
        border: '1px solid rgba(47,111,237,0.25)',
        borderRadius: '7px',
        padding: '6px 10px',
        color: '#6b9eff',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <HiPlus size={12} />
      {children}
    </button>
  );
}

function TrashBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'rgba(239,68,68,0.45)',
        padding: '4px',
        display: 'flex',
        flexShrink: 0,
        transition: 'color 0.12s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(239,68,68,0.45)')}
    >
      <HiOutlineTrash size={13} />
    </button>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const input: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '8px',
  padding: '8px 10px',
  color: '#fff',
  fontSize: '12px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.3)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  marginBottom: '7px',
};
