/*
 * Onglet « Master Print » — briques visuelles communes (même style que les
 * autres onglets admin du projet : cartes bleu nuit, Inter, libellés en capitales).
 */
import type { CSSProperties, ReactNode } from 'react';
import type { Tone } from '@/utils/masterPrint';

export const card: CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1.5px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '18px 20px',
  fontFamily: 'Inter, sans-serif',
  color: '#fff',
};

export const label: CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '11px',
  fontWeight: 600,
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export const input: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '13px',
  padding: '8px 10px',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  minHeight: '36px',
};

export const muted: CSSProperties = {
  color: 'rgba(255,255,255,0.55)',
  fontSize: '12.5px',
  lineHeight: 1.5,
};

export const sectionTitle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  margin: '0 0 10px',
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
      gap: '6px',
      padding: '8px 14px',
      borderRadius: '10px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.55 : 1,
      fontFamily: 'Inter, sans-serif',
      fontSize: '12.5px',
      fontWeight: 700,
      minHeight: '36px',
      ...(variant === 'primary'
        ? {
            color: '#fff',
            border: 'none',
            background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            boxShadow: '0 3px 12px rgba(47,111,237,0.35)',
          }
        : variant === 'danger'
          ? {
              color: '#fca5a5',
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.08)',
            }
          : {
              color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
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
        padding: '8px 12px 8px 26px',
        borderRadius: '10px',
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
  gap: '10px',
});
