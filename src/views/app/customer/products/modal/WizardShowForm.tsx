import { useState, useMemo } from 'react';
import { JSONValue } from '@/@types/form';
import { FormAnswer } from '@/@types/formAnswer';
import { HiArrowRight, HiArrowLeft, HiCheck } from 'react-icons/hi';
import { toast } from 'react-toastify';

// ── Types ────────────────────────────────────────────────────────────────────

type NormalizedField = {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: { label: string; value: string }[];
  content?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize fields from both new custom format and old Form.io format */
function normalizeFields(raw: JSONValue): NormalizedField[] {
  if (!raw) return [];
  const parsed: any = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(JSON.stringify(raw));

  let components: any[] = [];
  if (Array.isArray(parsed)) {
    components = parsed;
  } else if (parsed.fields && Array.isArray(parsed.fields)) {
    components = parsed.fields;
  } else if (parsed.components && Array.isArray(parsed.components)) {
    components = parsed.components;
  }

  return components
    .filter((c: any) => {
      // Skip layout-only, buttons, and hidden fields
      const t = c.type ?? '';
      return !['button', 'columns', 'panel', 'table', 'tabs', 'content', 'htmlelement', 'well', 'fieldset'].includes(t)
        && !c.hidden;
    })
    .map((c: any) => ({
      id: c.id ?? c.key ?? c.type + '_' + Math.random().toString(36).slice(2, 6),
      type: mapFieldType(c.type ?? 'textfield'),
      label: c.label ?? c.panelTitle ?? 'Champ',
      placeholder: c.placeholder ?? '',
      description: c.description ?? '',
      required: c.required ?? c.validate?.required ?? false,
      defaultValue: c.defaultValue ?? '',
      options: c.options ?? c.data?.values ?? c.values ?? undefined,
      content: c.content ?? undefined,
    }));
}

function mapFieldType(type: string): string {
  const map: Record<string, string> = {
    textfield: 'text', phoneNumber: 'tel', phone: 'tel',
    number: 'number', currency: 'number',
    email: 'email', url: 'url',
    password: 'password',
    datetime: 'datetime-local', day: 'date', time: 'time',
    textarea: 'textarea',
    select: 'select', radio: 'radio',
    checkbox: 'checkbox', checkboxgroup: 'checkboxgroup',
    selectboxes: 'checkboxgroup',
    file: 'file', signature: 'signature',
  };
  return map[type] ?? 'text';
}

// ── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff', fontSize: '15px', padding: '14px 16px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontWeight: 700, fontSize: '14px', color: '#f0f4ff',
  marginBottom: '8px',
};

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  fields: JSONValue;
  formAnswer: Partial<FormAnswer> | null;
  readOnly: boolean;
  onSubmit: (submission: any) => void;
};

export default function WizardShowForm({ fields, formAnswer, readOnly, onSubmit }: Props) {
  const normalizedFields = useMemo(() => normalizeFields(fields), [fields]);

  // Initialize values from existing formAnswer or defaults
  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    const existingData = (formAnswer?.answer as any)?.data ?? {};
    normalizedFields.forEach((f) => {
      if (existingData[f.id] !== undefined) {
        init[f.id] = existingData[f.id];
      } else if (f.type === 'checkbox') {
        init[f.id] = false;
      } else if (f.type === 'checkboxgroup') {
        init[f.id] = {};
      } else {
        init[f.id] = f.defaultValue ?? '';
      }
    });
    return init;
  });

  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = normalizedFields.length;

  if (totalSteps === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(160,185,220,0.5)' }}>
        Aucun champ dans ce formulaire.
      </div>
    );
  }

  const field = normalizedFields[currentStep];
  const value = values[field.id];

  const setValue = (v: any) => setValues((prev) => ({ ...prev, [field.id]: v }));

  const isFieldValid = (): boolean => {
    if (!field.required) return true;
    if (field.type === 'checkbox') return !!value;
    if (field.type === 'checkboxgroup') return Object.values(value || {}).some(Boolean);
    return value !== '' && value !== undefined && value !== null;
  };

  const handleNext = () => {
    if (!isFieldValid()) {
      toast.error('Ce champ est obligatoire');
      return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step — submit
      const data: Record<string, any> = {};
      normalizedFields.forEach((f) => { data[f.id] = values[f.id]; });
      onSubmit({ data, metadata: {}, state: 'submitted' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(160,185,220,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Question {currentStep + 1} sur {totalSteps}
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(160,185,220,0.35)' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'linear-gradient(90deg, #2f6fed, #22c55e)',
            borderRadius: '100px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '28px' }}>
        {normalizedFields.map((_, i) => (
          <div key={i} style={{
            width: i === currentStep ? '24px' : '8px', height: '8px', borderRadius: '100px',
            background: i < currentStep ? '#22c55e' : i === currentStep ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.08)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: i === currentStep ? '0 0 10px rgba(47,111,237,0.4)' : 'none',
            cursor: i < currentStep ? 'pointer' : 'default',
          }} onClick={() => { if (i < currentStep) setCurrentStep(i); }} />
        ))}
      </div>

      {/* Field */}
      <div key={field.id} style={{ animation: 'wizFadeIn 0.3s ease-out', minHeight: '120px' }}>
        <label style={labelStyle}>
          {field.label}
          {field.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>

        {field.description && (
          <p style={{ color: 'rgba(160,185,220,0.45)', fontSize: '12px', margin: '-4px 0 12px', lineHeight: 1.5 }}>
            {field.description}
          </p>
        )}

        {renderInput(field, value, setValue, readOnly, handleNext)}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          style={{
            padding: '10px 20px', borderRadius: '10px',
            background: currentStep === 0 ? 'transparent' : 'rgba(255,255,255,0.06)',
            border: currentStep === 0 ? 'none' : '1px solid rgba(255,255,255,0.1)',
            color: currentStep === 0 ? 'transparent' : 'rgba(255,255,255,0.5)',
            fontSize: '13px', fontWeight: 600, cursor: currentStep === 0 ? 'default' : 'pointer',
            fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <HiArrowLeft size={14} /> Précédent
        </button>

        <button
          onClick={handleNext}
          disabled={readOnly}
          style={{
            padding: '12px 28px', borderRadius: '10px', border: 'none', color: '#fff',
            fontSize: '14px', fontWeight: 700,
            cursor: readOnly ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
            background: currentStep === totalSteps - 1
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: currentStep === totalSteps - 1
              ? '0 4px 16px rgba(34,197,94,0.4)'
              : '0 4px 16px rgba(47,111,237,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {currentStep === totalSteps - 1 ? (
            <>Valider <HiCheck size={14} /></>
          ) : (
            <>Suivant <HiArrowRight size={14} /></>
          )}
        </button>
      </div>

      <style>{`@keyframes wizFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ── Input renderer ───────────────────────────────────────────────────────────

function renderInput(
  field: NormalizedField,
  value: any,
  setValue: (v: any) => void,
  readOnly: boolean,
  onEnter: () => void,
) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && field.type !== 'textarea') {
      e.preventDefault();
      onEnter();
    }
  };

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value)}
          readOnly={readOnly}
          placeholder={field.placeholder}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }}
        />
      );

    case 'select':
      return (
        <select
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value)}
          disabled={readOnly}
          style={{ ...inputStyle, appearance: 'auto', cursor: 'pointer' }}
        >
          <option value="">{field.placeholder || 'Sélectionner…'}</option>
          {(field.options ?? []).map((opt, i) => (
            <option key={i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(field.options ?? []).map((opt, i) => {
            const selected = value === opt.value;
            return (
              <label
                key={i}
                onClick={() => { if (!readOnly) setValue(opt.value); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '10px', cursor: readOnly ? 'default' : 'pointer',
                  background: selected ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${selected ? 'rgba(47,111,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  border: `2px solid ${selected ? '#2f6fed' : 'rgba(255,255,255,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}>
                  {selected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2f6fed' }} />}
                </div>
                <span style={{ color: selected ? '#a0c4ff' : 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: selected ? 600 : 400 }}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      );

    case 'checkbox':
      return (
        <label
          onClick={() => { if (!readOnly) setValue(!value); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 16px', borderRadius: '10px', cursor: readOnly ? 'default' : 'pointer',
            background: value ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
            border: `1.5px solid ${value ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: '22px', height: '22px', borderRadius: '6px',
            border: `2px solid ${value ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
            background: value ? '#22c55e' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}>
            {value && <HiCheck size={14} style={{ color: '#fff' }} />}
          </div>
          <span style={{ color: value ? '#4ade80' : 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: value ? 600 : 400 }}>
            Oui, je confirme
          </span>
        </label>
      );

    case 'checkboxgroup':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(field.options ?? []).map((opt, i) => {
            const checked = !!(value && value[opt.value]);
            return (
              <label
                key={i}
                onClick={() => {
                  if (readOnly) return;
                  setValue({ ...(value || {}), [opt.value]: !checked });
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '10px', cursor: readOnly ? 'default' : 'pointer',
                  background: checked ? 'rgba(47,111,237,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${checked ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '6px',
                  border: `2px solid ${checked ? '#2f6fed' : 'rgba(255,255,255,0.2)'}`,
                  background: checked ? '#2f6fed' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}>
                  {checked && <HiCheck size={12} style={{ color: '#fff' }} />}
                </div>
                <span style={{ color: checked ? '#a0c4ff' : 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: checked ? 600 : 400 }}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      );

    case 'file':
      return (
        <div style={{
          border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '12px',
          padding: '32px 16px', textAlign: 'center', cursor: 'pointer',
          background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s',
        }}>
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setValue(file.name);
            }}
            disabled={readOnly}
            style={{ display: 'none' }}
            id={`file_${field.id}`}
          />
          <label htmlFor={`file_${field.id}`} style={{ cursor: 'pointer', display: 'block' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.3 }}>📎</div>
            <p style={{ color: 'rgba(160,185,220,0.5)', fontSize: '13px', margin: 0 }}>
              {value ? value : 'Cliquez pour importer un fichier'}
            </p>
          </label>
        </div>
      );

    case 'signature':
      return (
        <div style={{
          border: '2px dashed rgba(255,255,255,0.12)', borderRadius: '12px',
          height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.02)',
        }}>
          <p style={{ color: 'rgba(160,185,220,0.4)', fontSize: '13px' }}>Zone de signature</p>
        </div>
      );

    default:
      return (
        <input
          type={field.type}
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value)}
          readOnly={readOnly}
          placeholder={field.placeholder}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            ...inputStyle,
            fontSize: '18px', padding: '16px 18px',
            borderColor: value ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.1)',
          }}
        />
      );
  }
}
