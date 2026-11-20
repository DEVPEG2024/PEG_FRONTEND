import type { CSSProperties, ReactNode } from 'react';

/*
 * Briques visuelles du formulaire d'offre configurable : mêmes couleurs que la
 * fiche produit (bleu nuit, cartes translucides, accent bleu PEG).
 */

export const C = {
  text: '#f0f4ff',
  muted: 'rgba(160,185,220,0.62)',
  faint: 'rgba(160,185,220,0.42)',
  border: 'rgba(255,255,255,0.08)',
  card: 'rgba(255,255,255,0.03)',
  accent: '#2f6fed',
  accentSoft: 'rgba(47,111,237,0.14)',
  accentText: '#8db4ff',
  ok: '#4ade80',
  warn: '#fbbf24',
  error: '#f87171',
};

export const Section = ({
  step,
  title,
  hint,
  children,
  aside,
}: {
  step?: number;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) => (
  <section
    style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: '16px',
      padding: 'var(--peg-pad-20)',
    }}
  >
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: hint ? '4px' : '14px',
      }}
    >
      {step != null && (
        <span
          aria-hidden
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '999px',
            background: C.accentSoft,
            color: C.accentText,
            fontSize: '12px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {step}
        </span>
      )}
      <h3
        style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: 700,
          color: C.text,
          flex: 1,
        }}
      >
        {title}
      </h3>
      {aside}
    </header>
    {hint && (
      <p
        style={{
          margin: '0 0 14px',
          fontSize: '12.5px',
          color: C.muted,
          lineHeight: 1.5,
          paddingLeft: step != null ? '34px' : 0,
        }}
      >
        {hint}
      </p>
    )}
    {children}
  </section>
);

export const Chip = ({
  active,
  onClick,
  children,
  disabled,
  title,
  style,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
}) => (
  <button
    type="button"
    className="peg-tap-target"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-pressed={!!active}
    style={{
      background: active ? C.accentSoft : 'rgba(255,255,255,0.035)',
      border: `1.5px solid ${active ? C.accent : C.border}`,
      color: disabled ? C.faint : active ? '#fff' : C.text,
      borderRadius: '12px',
      padding: '9px 14px',
      fontSize: '13px',
      fontWeight: active ? 700 : 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      textAlign: 'left',
      lineHeight: 1.3,
      transition: 'border-color .15s ease, background .15s ease',
      opacity: disabled ? 0.55 : 1,
      ...style,
    }}
  >
    {children}
  </button>
);

export const Label = ({ children }: { children: ReactNode }) => (
  <span
    style={{
      display: 'block',
      color: C.faint,
      fontSize: '10.5px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      marginBottom: '6px',
    }}
  >
    {children}
  </span>
);

export const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${C.border}`,
  borderRadius: '10px',
  color: '#fff',
  fontSize: '15px',
  padding: '10px 12px',
  outline: 'none',
};

/** Champ numérique avec boutons − / + (quantités par taille, quantité). */
export const Stepper = ({
  value,
  onChange,
  min = 0,
  step = 1,
  label,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  label?: ReactNode;
  ariaLabel: string;
}) => {
  const btn: CSSProperties = {
    width: '34px',
    height: '38px',
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    color: C.text,
    fontSize: '18px',
    cursor: 'pointer',
    flexShrink: 0,
  };
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          border: `1px solid ${value > 0 ? 'rgba(47,111,237,0.45)' : C.border}`,
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          aria-label={`Moins — ${ariaLabel}`}
          style={btn}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          aria-label={ariaLabel}
          value={value || ''}
          placeholder="0"
          min={min}
          step={step}
          onChange={(e) =>
            onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))
          }
          style={{
            ...inputStyle,
            border: 'none',
            borderRadius: 0,
            textAlign: 'center',
            padding: '8px 4px',
            minWidth: 0,
            background: 'transparent',
          }}
        />
        <button
          type="button"
          aria-label={`Plus — ${ariaLabel}`}
          style={btn}
          onClick={() => onChange(value + step)}
        >
          +
        </button>
      </div>
    </div>
  );
};

export const Swatch = ({
  hex,
  size = 34,
}: {
  hex: string | null;
  size?: number;
}) => (
  <span
    aria-hidden
    style={{
      width: size,
      height: size,
      borderRadius: '999px',
      background: hex || 'linear-gradient(135deg,#ccc,#666)',
      border: '2px solid rgba(255,255,255,0.18)',
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)',
      display: 'inline-block',
      flexShrink: 0,
    }}
  />
);
