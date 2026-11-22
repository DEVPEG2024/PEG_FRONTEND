/*
 * Master Print — briques visuelles communes (onglet du projet, page Master Print,
 * réglages d'offre). Depuis le 22/11/2026, alignées sur le design « hub »
 * (components/shared/hub) : cartes bleu nuit arrondies, libellés en minuscules,
 * action en violet PEG.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { Tone } from '@/utils/masterPrint';

export const card: CSSProperties = {
  background: 'linear-gradient(165deg, #16223b 0%, #0f182b 100%)',
  border: '1px solid rgba(140,160,255,0.09)',
  borderRadius: '20px',
  padding: '20px 22px',
  fontFamily: 'Inter, sans-serif',
  color: '#fff',
};

export const label: CSSProperties = {
  color: 'rgba(226,232,255,0.55)',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '4px',
};

export const input: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '13.5px',
  padding: '9px 12px',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  minHeight: '40px',
};

export const muted: CSSProperties = {
  color: 'rgba(226,232,255,0.58)',
  fontSize: '13px',
  lineHeight: 1.5,
};

export const sectionTitle: CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  letterSpacing: '-0.01em',
  margin: '0 0 12px',
  color: '#fff',
};

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  title?: string;
};

export const Btn = ({
  children,
  onClick,
  disabled,
  variant = 'ghost',
  type = 'button',
  title,
}: BtnProps) => (
  <button
    type={type}
    className="peg-tap-target"
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '7px',
      padding: '8px 16px',
      borderRadius: '12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      fontFamily: 'Inter, sans-serif',
      fontSize: '13px',
      fontWeight: 700,
      minHeight: '38px',
      whiteSpace: 'nowrap',
      ...(variant === 'primary'
        ? {
            color: '#fff',
            border: 'none',
            background: 'linear-gradient(135deg, #8b7dff 0%, #5b47e0 100%)',
            boxShadow: '0 6px 18px rgba(91,71,224,0.35)',
          }
        : variant === 'danger'
          ? {
              color: '#fca5a5',
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.08)',
            }
          : {
              color: 'rgba(240,244,255,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
            }),
    }}
  >
    {children}
  </button>
);

export const Pill = ({
  tone,
  children,
}: {
  tone: Tone;
  children: ReactNode;
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '3px 10px',
      borderRadius: '100px',
      fontSize: '11.5px',
      fontWeight: 700,
      color: tone.color,
      background: tone.background,
      border: `1px solid ${tone.border}`,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

export const SANDBOX_TONE: Tone = {
  color: '#fcd34d',
  background: 'rgba(245,158,11,0.12)',
  border: 'rgba(245,158,11,0.35)',
};
export const LIVE_TONE: Tone = {
  color: '#86efac',
  background: 'rgba(34,197,94,0.12)',
  border: 'rgba(34,197,94,0.35)',
};

export const Field = ({
  title,
  children,
  style,
}: {
  title: string;
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <label
    style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}
  >
    <span style={label}>{title}</span>
    {children}
  </label>
);

/** Liste de problèmes à régler avant l'envoi. */
export const Issues = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul
      style={{
        margin: '8px 0 0',
        padding: '10px 14px 10px 28px',
        borderRadius: '12px',
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.25)',
        color: '#fcd34d',
        fontSize: '12.5px',
        lineHeight: 1.6,
      }}
    >
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  ) : null;

/** Grille qui passe sur une colonne au téléphone. */
export const grid = (min: number): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`,
  gap: '12px',
});
