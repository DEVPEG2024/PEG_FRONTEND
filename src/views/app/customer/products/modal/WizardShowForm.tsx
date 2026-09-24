import { useState, useMemo, useRef } from 'react';
import { JSONValue } from '@/@types/form';
import { FormAnswer } from '@/@types/formAnswer';
import { HiArrowRight, HiArrowLeft, HiCheck, HiUpload, HiX, HiPaperClip } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { apiUploadFile } from '@/services/FileServices';
import { env } from '@/configs/env.config';

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
  /** Champ fichier : extensions acceptées (`filePattern` Formio) et envoi multiple. */
  accept?: string;
  multiple?: boolean;
};

/**
 * Valeur d'un champ fichier, au format natif Formio (`storage: 'url'`) : la fiche commande
 * côté admin relit la réponse avec Formio, qui affiche ces entrées comme des liens.
 */
type FormFileValue = {
  storage: 'url';
  name: string;
  originalName: string;
  url: string;
  size: number;
  type: string;
};

type FieldGroup = {
  title: string;
  fields: NormalizedField[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively extract input fields from a component tree */
function extractFields(components: any[]): NormalizedField[] {
  const result: NormalizedField[] = [];
  for (const c of components) {
    const t = c.type ?? '';
    // Layout containers → recurse into children
    if (['panel', 'well', 'fieldset', 'container'].includes(t) && Array.isArray(c.components)) {
      result.push(...extractFields(c.components));
      continue;
    }
    if (t === 'columns' && Array.isArray(c.columns)) {
      for (const col of c.columns) {
        if (Array.isArray(col.components)) result.push(...extractFields(col.components));
      }
      continue;
    }
    if (t === 'table' && Array.isArray(c.rows)) {
      for (const row of c.rows) {
        for (const cell of row) {
          if (Array.isArray(cell.components)) result.push(...extractFields(cell.components));
        }
      }
      continue;
    }
    if (t === 'tabs' && Array.isArray(c.components)) {
      for (const tab of c.components) {
        if (Array.isArray(tab.components)) result.push(...extractFields(tab.components));
      }
      continue;
    }
    if (Array.isArray(c.components) && c.components.length > 0) {
      result.push(...extractFields(c.components));
      continue;
    }
    // Skip non-input elements
    if (['button', 'content', 'htmlelement'].includes(t) || c.hidden) continue;
    result.push({
      id: c.id ?? c.key ?? c.type + '_' + Math.random().toString(36).slice(2, 6),
      type: mapFieldType(c.type ?? 'textfield'),
      label: c.label ?? c.panelTitle ?? 'Champ',
      placeholder: c.placeholder ?? '',
      description: c.description ?? '',
      required: c.required ?? c.validate?.required ?? false,
      defaultValue: c.defaultValue ?? '',
      options: c.options ?? c.data?.values ?? c.values ?? undefined,
      content: c.content ?? undefined,
      accept: c.filePattern && c.filePattern !== '*' ? c.filePattern : undefined,
      multiple: !!c.multiple,
    });
  }
  return result;
}

/** Build groups from the form structure — panels/sections become steps */
function buildGroups(raw: JSONValue): FieldGroup[] {
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

  // Check if there are natural grouping containers at the top level
  const hasContainers = components.some((c: any) =>
    ['panel', 'well', 'fieldset'].includes(c.type ?? '')
  );

  if (hasContainers) {
    // Use containers as step boundaries
    const groups: FieldGroup[] = [];
    let loose: NormalizedField[] = [];

    for (const c of components) {
      const t = c.type ?? '';
      if (['panel', 'well', 'fieldset'].includes(t) && Array.isArray(c.components)) {
        // Flush loose fields first
        if (loose.length > 0) {
          groups.push({ title: 'Informations', fields: loose });
          loose = [];
        }
        const fields = extractFields(c.components);
        if (fields.length > 0) {
          groups.push({
            title: c.panelTitle ?? c.title ?? c.label ?? `Section ${groups.length + 1}`,
            fields,
          });
        }
      } else {
        const fields = extractFields([c]);
        loose.push(...fields);
      }
    }
    if (loose.length > 0) {
      groups.push({ title: 'Informations complémentaires', fields: loose });
    }
    return groups.filter(g => g.fields.length > 0);
  }

  // No containers — group flat fields in chunks of 3
  const allFields = extractFields(components);
  if (allFields.length === 0) return [];

  const CHUNK = 3;
  const groups: FieldGroup[] = [];
  for (let i = 0; i < allFields.length; i += CHUNK) {
    const chunk = allFields.slice(i, i + CHUNK);
    groups.push({
      title: groups.length === 0 ? 'Informations' : `Suite (${groups.length + 1}/${Math.ceil(allFields.length / CHUNK)})`,
      fields: chunk,
    });
  }
  return groups;
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

/**
 * Type hérité qu'aucune interaction ne peut remplir : le champ « Signature » n'écrit aucune
 * valeur. Il est retiré du constructeur, mais des formulaires le contiennent déjà en base — marqué
 * obligatoire, il enfermerait le client dans le tunnel. On ne le compte donc jamais comme
 * obligatoire et on ne lui affiche pas d'astérisque.
 */
const NON_FILLABLE_TYPES = ['signature'];

/** Fichiers réellement téléversés d'un champ (une ancienne réponse peut ne contenir qu'un nom). */
function uploadedFiles(value: any): FormFileValue[] {
  return Array.isArray(value) ? value.filter((f) => f && typeof f.url === 'string') : [];
}

const resolveFileUrl = (url: string) => (url.startsWith('http') ? url : env.API_ENDPOINT_URL + url);

// ── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1.5px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff', fontSize: '14px', padding: '12px 14px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontWeight: 600, fontSize: '13px', color: '#f0f4ff',
  marginBottom: '6px',
};

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  fields: JSONValue;
  formAnswer: Partial<FormAnswer> | null;
  readOnly: boolean;
  onSubmit: (submission: any) => void;
};

export default function WizardShowForm({ fields, formAnswer, readOnly, onSubmit }: Props) {
  const groups = useMemo(() => buildGroups(fields), [fields]);
  const allFields = useMemo(() => groups.flatMap(g => g.fields), [groups]);

  // Initialize values from existing formAnswer or defaults
  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    const existingData = (formAnswer?.answer as any)?.data ?? {};
    allFields.forEach((f) => {
      if (existingData[f.id] !== undefined) {
        init[f.id] = existingData[f.id];
      } else if (f.type === 'checkbox') {
        init[f.id] = false;
      } else if (f.type === 'checkboxgroup') {
        init[f.id] = {};
      } else if (f.type === 'file') {
        init[f.id] = [];
      } else {
        init[f.id] = f.defaultValue ?? '';
      }
    });
    return init;
  });

  const [currentStep, setCurrentStep] = useState(0);
  // Envois de fichiers en cours : on ne valide pas l'étape tant qu'un fichier n'est pas arrivé.
  const [uploading, setUploading] = useState(0);
  const totalSteps = groups.length;

  if (totalSteps === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(160,185,220,0.5)' }}>
        Aucun champ dans ce formulaire.
      </div>
    );
  }

  const group = groups[currentStep];

  const setFieldValue = (id: string, v: any) => setValues((prev) => ({ ...prev, [id]: v }));

  const isGroupValid = (): boolean => {
    for (const f of group.fields) {
      if (!f.required) continue;
      if (NON_FILLABLE_TYPES.includes(f.type)) continue;
      const v = values[f.id];
      if (f.type === 'checkbox' && !v) return false;
      if (f.type === 'checkboxgroup' && !Object.values(v || {}).some(Boolean)) return false;
      if (f.type === 'file' && uploadedFiles(v).length === 0) return false;
      if (v === '' || v === undefined || v === null) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (uploading > 0) {
      toast.info('Envoi du fichier en cours, patientez un instant…');
      return;
    }
    if (!isGroupValid()) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      const data: Record<string, any> = {};
      allFields.forEach((f) => { data[f.id] = values[f.id]; });
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
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(160,185,220,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Étape {currentStep + 1} sur {totalSteps}
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
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '24px' }}>
        {groups.map((_, i) => (
          <div key={i} style={{
            width: i === currentStep ? '28px' : '8px', height: '8px', borderRadius: '100px',
            background: i < currentStep ? '#22c55e' : i === currentStep ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.08)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: i === currentStep ? '0 0 10px rgba(47,111,237,0.4)' : 'none',
            cursor: i < currentStep ? 'pointer' : 'default',
          }} onClick={() => { if (i < currentStep) setCurrentStep(i); }} />
        ))}
      </div>

      {/* Group title */}
      <h4 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700, color: '#f0f4ff', textAlign: 'center' }}>
        {group.title}
      </h4>

      {/* Fields */}
      <div key={currentStep} style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'wizFadeIn 0.3s ease-out' }}>
        {group.fields.map((field) => (
          <div key={field.id}>
            <label style={labelStyle}>
              {field.label}
              {field.required && !NON_FILLABLE_TYPES.includes(field.type) && (
                <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
              )}
            </label>
            {field.description && (
              <p style={{ color: 'rgba(160,185,220,0.45)', fontSize: '11px', margin: '-2px 0 8px', lineHeight: 1.5 }}>
                {field.description}
              </p>
            )}
            {field.type === 'file' ? (
              <FileInput
                field={field}
                value={values[field.id]}
                setValue={(update) => setValues((prev) => ({ ...prev, [field.id]: update(prev[field.id]) }))}
                readOnly={readOnly}
                onUploadingChange={(delta) => setUploading((n) => n + delta)}
              />
            ) : (
              renderInput(field, values[field.id], (v: any) => setFieldValue(field.id, v), readOnly)
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <button
          className="peg-tap-target"
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
          className="peg-tap-target"
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

/** Encadré informatif pour un champ hérité qu'aucune saisie ne peut remplir. */
function UnavailableField({ text }: { text: string }) {
  return (
    <div style={{
      border: '1px solid rgba(251,191,36,0.25)', borderRadius: '12px',
      padding: '12px 14px', background: 'rgba(251,191,36,0.06)',
    }}>
      <p style={{ color: 'rgba(253,224,71,0.85)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  );
}

/**
 * Champ fichier : le fichier est réellement téléversé (`/upload-single`, S3 direct au-delà de
 * 5 Mo) et la réponse garde son URL — plus seulement son nom, comme l'ancien rendu.
 */
function FileInput({
  field,
  value,
  setValue,
  readOnly,
  onUploadingChange,
}: {
  field: NormalizedField;
  value: any;
  setValue: (update: (prev: any) => any) => void;
  readOnly: boolean;
  onUploadingChange: (delta: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<string[]>([]);
  const files = uploadedFiles(value);
  // Ancienne réponse qui n'a retenu qu'un nom de fichier : on l'affiche sans lien.
  const legacyName = typeof value === 'string' && value ? value : null;

  const handleFiles = async (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    if (inputRef.current) inputRef.current.value = '';
    if (picked.length === 0) return;
    const toSend = field.multiple ? picked : picked.slice(0, 1);

    for (const file of toSend) {
      setPending((p) => [...p, file.name]);
      onUploadingChange(1);
      try {
        const uploaded = await apiUploadFile(file);
        if (!uploaded?.url) throw new Error('Réponse sans URL');
        const entry: FormFileValue = {
          storage: 'url',
          name: uploaded.name ?? file.name,
          originalName: file.name,
          url: resolveFileUrl(uploaded.url),
          size: file.size,
          type: file.type,
        };
        setValue((prev) => (field.multiple ? [...uploadedFiles(prev), entry] : [entry]));
      } catch {
        toast.error(`L'envoi de « ${file.name} » a échoué. Réessayez.`);
      } finally {
        setPending((p) => {
          const i = p.indexOf(file.name);
          return i === -1 ? p : [...p.slice(0, i), ...p.slice(i + 1)];
        });
        onUploadingChange(-1);
      }
    }
  };

  const remove = (url: string) => setValue((prev) => uploadedFiles(prev).filter((f) => f.url !== url));

  const canAdd = !readOnly && (field.multiple || (files.length === 0 && pending.length === 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {files.map((f) => (
        <div key={f.url} style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
          borderRadius: '10px', background: 'rgba(34,197,94,0.08)', border: '1.5px solid rgba(34,197,94,0.3)',
        }}>
          <HiPaperClip size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
          <a href={f.url} target="_blank" rel="noreferrer" style={{
            color: '#4ade80', fontSize: '13px', fontWeight: 600, flex: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {f.originalName || f.name}
          </a>
          {!readOnly && (
            <button type="button" onClick={() => remove(f.url)} aria-label={`Retirer ${f.originalName || f.name}`} style={{
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              display: 'flex', padding: '4px',
            }}>
              <HiX size={16} />
            </button>
          )}
        </div>
      ))}

      {pending.map((name, i) => (
        <div key={`${name}-${i}`} style={{
          padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
          background: 'rgba(47,111,237,0.08)', border: '1.5px solid rgba(47,111,237,0.3)', color: '#a0c4ff',
        }}>
          Envoi de « {name} »…
        </div>
      ))}

      {legacyName && files.length === 0 && (
        <p style={{ color: 'rgba(160,185,220,0.6)', fontSize: '12px', margin: 0 }}>
          Fichier indiqué précédemment : {legacyName} (non transmis — merci de le joindre à nouveau)
        </p>
      )}

      {canAdd && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={field.accept}
            multiple={field.multiple}
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="peg-tap-target"
            onClick={() => inputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '14px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
              background: 'rgba(0,0,0,0.3)', border: '1.5px dashed rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
            }}
          >
            <HiUpload size={16} />
            {files.length > 0 ? 'Ajouter un autre fichier' : 'Choisir un fichier'}
          </button>
        </>
      )}
    </div>
  );
}

// ── Input renderer ───────────────────────────────────────────────────────────

function renderInput(
  field: NormalizedField,
  value: any,
  setValue: (v: any) => void,
  readOnly: boolean,
) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value)}
          readOnly={readOnly}
          placeholder={field.placeholder}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(field.options ?? []).map((opt, i) => {
            const selected = value === opt.value;
            return (
              <label
                key={i}
                onClick={() => { if (!readOnly) setValue(opt.value); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '10px', cursor: readOnly ? 'default' : 'pointer',
                  background: selected ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${selected ? 'rgba(47,111,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '50%',
                  border: `2px solid ${selected ? '#2f6fed' : 'rgba(255,255,255,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}>
                  {selected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2f6fed' }} />}
                </div>
                <span style={{ color: selected ? '#a0c4ff' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: selected ? 600 : 400 }}>
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
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', borderRadius: '10px', cursor: readOnly ? 'default' : 'pointer',
            background: value ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
            border: `1.5px solid ${value ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.2s',
          }}
        >
          <div style={{
            width: '20px', height: '20px', borderRadius: '6px',
            border: `2px solid ${value ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
            background: value ? '#22c55e' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}>
            {value && <HiCheck size={12} style={{ color: '#fff' }} />}
          </div>
          <span style={{ color: value ? '#4ade80' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: value ? 600 : 400 }}>
            Oui, je confirme
          </span>
        </label>
      );

    case 'checkboxgroup':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '10px', cursor: readOnly ? 'default' : 'pointer',
                  background: checked ? 'rgba(47,111,237,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${checked ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px',
                  border: `2px solid ${checked ? '#2f6fed' : 'rgba(255,255,255,0.2)'}`,
                  background: checked ? '#2f6fed' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                }}>
                  {checked && <HiCheck size={10} style={{ color: '#fff' }} />}
                </div>
                <span style={{ color: checked ? '#a0c4ff' : 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: checked ? 600 : 400 }}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      );

    // Champ hérité inerte : on l'annonce au lieu de simuler une réussite — la zone de signature
    // n'écrivait jamais rien.
    case 'signature':
      return <UnavailableField text="La signature en ligne n'est pas disponible. Ce champ n'est pas nécessaire pour valider votre demande." />;

    default:
      return (
        <input
          type={field.type}
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value)}
          readOnly={readOnly}
          placeholder={field.placeholder}
          style={{
            ...inputStyle,
            borderColor: value ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.1)',
          }}
        />
      );
  }
}
