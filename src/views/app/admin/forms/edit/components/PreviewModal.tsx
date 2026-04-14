import { Field, FormStructure } from '../types';
import { HiX } from 'react-icons/hi';
import { safeHtmlParse } from '@/utils/sanitizeHtml';

const fadeSlideKeyframes = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(32px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  structure: FormStructure;
  formName: string;
};

export default function PreviewModal({
  isOpen,
  onClose,
  structure,
  formName,
}: Props) {
  const { banner, fields } = structure;

  if (!isOpen) return null;

  return (
    <>
      <style>{fadeSlideKeyframes}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out',
          padding: '24px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '740px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.06)',
            animation: 'slideUp 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column' as const,
          }}
        >
          {/* Inner light card */}
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              background: '#f8fafc',
              borderRadius: '16px',
              overflow: 'hidden',
              margin: '12px',
              maxHeight: 'calc(90vh - 24px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Preview header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '13px 18px',
                borderBottom: '1px solid #e5e7eb',
                background: '#fff',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#22c55e',
                  }}
                />
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>
                  Aperçu du formulaire
                </span>
                <span
                  style={{
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    color: '#6b7280',
                    fontWeight: 600,
                  }}
                >
                  Lecture seule
                </span>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  display: 'flex',
                  padding: '4px',
                  borderRadius: '6px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
              >
                <HiX size={18} />
              </button>
            </div>

            {/* Form content */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Banner */}
              {(banner?.imageDataUrl || banner?.title || banner?.subtitle) && (
                <div>
                  {banner.imageDataUrl && (
                    <img
                      src={banner.imageDataUrl}
                      alt=""
                      style={{
                        width: '100%',
                        maxHeight: '220px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  )}
                  {(banner.title || banner.subtitle) && (
                    <div
                      style={{
                        padding: '28px 36px 20px',
                        background: banner.imageDataUrl ? '#fff' : '#f1f5f9',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      {banner.title && (
                        <h1
                          style={{
                            color: '#111827',
                            fontSize: '24px',
                            fontWeight: 800,
                            margin: '0 0 6px',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {banner.title}
                        </h1>
                      )}
                      {banner.subtitle && (
                        <p
                          style={{ color: '#6b7280', fontSize: '14px', margin: 0, lineHeight: 1.6 }}
                        >
                          {banner.subtitle}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Form name fallback */}
              {!banner?.title && formName && (
                <div style={{ padding: '28px 36px 0' }}>
                  <h2
                    style={{
                      color: '#111827',
                      fontSize: '22px',
                      fontWeight: 800,
                      margin: 0,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {formName}
                  </h2>
                </div>
              )}

              {/* Fields */}
              <div
                style={{
                  padding: '24px 36px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  alignItems: 'flex-start',
                }}
              >
                {fields.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '13px' }}>
                    Aucun champ ajouté au formulaire.
                  </p>
                ) : (
                  fields.map((field) => <PreviewField key={field.id} field={field} />)
                )}
              </div>

              {/* Submit button */}
              <div style={{ padding: '4px 36px 36px' }}>
                <button
                  style={{
                    background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 28px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                  }}
                >
                  Soumettre
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Field renderers ───────────────────────────────────────────────────────────

function PreviewField({ field }: { field: Field }) {
  const pct = field.width ?? 100;
  const w = pct === 100 ? '100%' : `calc(${pct}% - 8px)`;
  const wrap: React.CSSProperties = { width: w, flexShrink: 0 };

  if (field.type === 'content') {
    return (
      <div
        style={{ ...wrap, width: '100%', color: '#374151', fontSize: '14px', lineHeight: 1.7 }}
      >
        {safeHtmlParse(field.content ?? '')}
      </div>
    );
  }

  if (field.type === 'columns') {
    const n = field.columns ?? 2;
    return (
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: `repeat(${n},1fr)`, gap: '12px' }}>
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            style={{
              background: '#f1f5f9',
              border: '1.5px dashed #d1d5db',
              borderRadius: '8px',
              minHeight: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '12px',
            }}
          >
            Colonne {i + 1}
          </div>
        ))}
      </div>
    );
  }

  if (field.type === 'panel') {
    return (
      <div
        style={{
          width: '100%',
          border: '1.5px solid #d1d5db',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        {field.panelTitle && (
          <div
            style={{
              background: '#f3f4f6',
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: '13px',
              color: '#374151',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {field.panelTitle}
          </div>
        )}
        <div style={{ padding: '16px', color: '#9ca3af', fontSize: '13px', minHeight: '48px' }}>
          Contenu du panneau…
        </div>
      </div>
    );
  }

  if (field.type === 'table') {
    const rows = field.rows ?? 3;
    const cols = field.cols ?? 3;
    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td
                    key={c}
                    style={{
                      border: '1px solid #e5e7eb',
                      padding: '8px 12px',
                      background: r === 0 ? '#f3f4f6' : '#fff',
                      fontWeight: r === 0 ? 700 : 400,
                      color: r === 0 ? '#374151' : '#6b7280',
                      minWidth: '80px',
                    }}
                  >
                    {r === 0 ? `En-tête ${c + 1}` : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (field.type === 'tabs') {
    const tabs = field.tabs ?? ['Onglet 1'];
    return (
      <div
        style={{
          width: '100%',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {tabs.map((tab, i) => (
            <div
              key={i}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: i === 0 ? 700 : 500,
                color: i === 0 ? '#2563eb' : '#6b7280',
                borderBottom: i === 0 ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'default',
              }}
            >
              {tab}
            </div>
          ))}
        </div>
        <div style={{ padding: '20px', color: '#9ca3af', fontSize: '13px' }}>
          Contenu de l'onglet "{tabs[0]}"…
        </div>
      </div>
    );
  }

  // Generic field label + description
  const Label = (
    <label
      style={{
        display: 'block',
        fontWeight: 600,
        fontSize: '13px',
        color: '#374151',
        marginBottom: '6px',
      }}
    >
      {field.label || 'Sans titre'}
      {field.required && (
        <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>
      )}
    </label>
  );

  const Description = field.description ? (
    <p style={{ color: '#6b7280', fontSize: '11.5px', margin: '5px 0 0', lineHeight: 1.5 }}>
      {field.description}
    </p>
  ) : null;

  const base: React.CSSProperties = {
    width: '100%',
    border: '1.5px solid #d1d5db',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '13px',
    color: '#111827',
    background: '#fff',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
  };

  switch (field.type) {
    case 'checkbox':
      return (
        <div style={wrap}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
            <input type="checkbox" readOnly style={{ width: '15px', height: '15px' }} />
            <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
              {field.label}
            </span>
          </label>
          {Description}
        </div>
      );

    case 'checkboxgroup':
      return (
        <div style={wrap}>
          {Label}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {(field.options ?? [{ label: 'Option 1', value: 'o1' }]).map((opt, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
                <input type="checkbox" readOnly style={{ width: '14px', height: '14px' }} />
                <span style={{ fontSize: '13px', color: '#374151' }}>{opt.label}</span>
              </label>
            ))}
          </div>
          {Description}
        </div>
      );

    case 'radio':
      return (
        <div style={wrap}>
          {Label}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {(field.options ?? [{ label: 'Option 1', value: 'o1' }]).map((opt, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
                <input type="radio" readOnly name={`preview_${field.id}`} style={{ width: '14px', height: '14px' }} />
                <span style={{ fontSize: '13px', color: '#374151' }}>{opt.label}</span>
              </label>
            ))}
          </div>
          {Description}
        </div>
      );

    case 'select':
      return (
        <div style={wrap}>
          {Label}
          <select style={{ ...base, cursor: 'default' }}>
            <option value="">{field.placeholder || 'Sélectionner…'}</option>
            {(field.options ?? []).map((opt, i) => (
              <option key={i} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {Description}
        </div>
      );

    case 'textarea':
      return (
        <div style={wrap}>
          {Label}
          <textarea
            readOnly
            placeholder={field.placeholder}
            style={{ ...base, height: '80px', resize: 'none' }}
          />
          {Description}
        </div>
      );

    case 'file':
      return (
        <div style={wrap}>
          {Label}
          <div
            style={{
              border: '1.5px dashed #d1d5db',
              borderRadius: '8px',
              padding: '22px 16px',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '12px',
              background: '#fafafa',
            }}
          >
            ↑ Cliquez pour importer un fichier
          </div>
          {Description}
        </div>
      );

    case 'signature':
      return (
        <div style={wrap}>
          {Label}
          <div
            style={{
              border: '1.5px dashed #d1d5db',
              borderRadius: '8px',
              height: '90px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '12px',
              background: '#fafafa',
            }}
          >
            ✍ Zone de signature
          </div>
          {Description}
        </div>
      );

    default: {
      const inputType =
        field.type === 'password' ? 'password'
        : field.type === 'number' || field.type === 'currency' ? 'number'
        : field.type === 'email' ? 'email'
        : field.type === 'url' ? 'url'
        : field.type === 'datetime' ? 'datetime-local'
        : field.type === 'day' ? 'date'
        : field.type === 'time' ? 'time'
        : 'text';

      return (
        <div style={wrap}>
          {Label}
          <input
            type={inputType}
            readOnly
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            style={base}
          />
          {Description}
        </div>
      );
    }
  }
}
