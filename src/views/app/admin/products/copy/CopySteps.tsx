import type { CSSProperties } from 'react';
import { HiCheck } from 'react-icons/hi';

const STEPS = ['Choisir', 'Noms', 'Photos'];

export const ACCENT = '#2f6fed';
export const MUTED = 'rgba(255,255,255,0.62)';
export const CARD: CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '18px',
};

export const buttonStyle = (
  primary: boolean,
  disabled = false
): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  minHeight: '44px',
  padding: '0 20px',
  borderRadius: '12px',
  border: primary ? 'none' : '1px solid rgba(255,255,255,0.16)',
  background: primary ? ACCENT : 'transparent',
  color: '#fff',
  fontFamily: 'Inter, sans-serif',
  fontSize: '14px',
  fontWeight: primary ? 700 : 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});

/** Pastilles « 1 Choisir · 2 Noms · 3 Photos » (étape courante = index). */
const CopySteps = ({ current }: { current: number }) => (
  <ol
    aria-label="Étapes"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      listStyle: 'none',
      margin: 0,
      padding: 0,
      flexWrap: 'wrap',
    }}
  >
    {STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <li
          key={label}
          aria-current={active ? 'step' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '36px',
            padding: '0 14px 0 6px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: active ? 700 : 600,
            background: active
              ? ACCENT
              : done
                ? 'rgba(74,222,128,0.14)'
                : 'rgba(255,255,255,0.06)',
            color: active ? '#fff' : done ? '#86efac' : 'rgba(255,255,255,0.7)',
          }}
        >
          <span
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: active
                ? 'rgba(255,255,255,0.22)'
                : done
                  ? 'rgba(74,222,128,0.22)'
                  : 'transparent',
              border:
                active || done ? 'none' : '1px solid rgba(255,255,255,0.25)',
            }}
          >
            {done ? <HiCheck size={13} /> : i + 1}
          </span>
          {label}
        </li>
      );
    })}
  </ol>
);

export default CopySteps;
