import type { CSSProperties, ReactNode } from 'react';
import type { AgentStatusValue, Severity } from '@/services/AgentServices';
import { env } from '@/configs/env.config';

/** Éléments visuels partagés par les écrans des agents (même langage que la Relecture). */

export const PANEL: CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
};

export const labelStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

export const mutedText: CSSProperties = { color: 'rgba(255,255,255,0.5)', fontSize: '12px' };

export const btn = (color: string, filled = false): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: filled ? color : 'rgba(255,255,255,0.04)',
  border: `1px solid ${filled ? color : 'rgba(255,255,255,0.12)'}`,
  color: filled ? '#fff' : color,
  borderRadius: '8px', padding: '7px 12px',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', textDecoration: 'none',
});

export const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.25)', color: '#e6eefa',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px',
  fontSize: '13px', fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
};

export const SEVERITY: Record<Severity, { label: string; color: string; bg: string }> = {
  critical: { label: 'Bloquant', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  warning: { label: 'À vérifier', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  info: { label: 'Remarque', color: '#93c5fd', bg: 'rgba(147,197,253,0.1)' },
};

export const STATUS_LABEL: Record<AgentStatusValue, { label: string; color: string }> = {
  applied: { label: 'Appliqué', color: '#4ade80' },
  proposed: { label: 'À valider', color: '#60a5fa' },
  accepted: { label: 'Validé', color: '#4ade80' },
  rejected: { label: 'Classé', color: 'rgba(255,255,255,0.45)' },
  reverted: { label: 'Annulé', color: '#fbbf24' },
  stale: { label: 'Périmé', color: 'rgba(255,255,255,0.45)' },
  blocked: { label: 'Bloqué par un garde-fou', color: '#f87171' },
  flagged: { label: 'À traiter', color: '#fb923c' },
  checked: { label: 'Conforme', color: '#4ade80' },
};

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export const eur = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(Number(n)) ? '—' : `${Number(n).toFixed(2).replace('.', ',')} €`;

/** Adresse d'un fichier : S3 (absolue) en production, relative à Strapi en local. */
export const fileUrl = (url: string | null | undefined) =>
  !url ? '' : /^https?:\/\//.test(url) ? url : `${env?.API_ENDPOINT_URL ?? ''}${url}`;

export const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || fallback;

export const Toggle = ({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    style={{
      width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative',
      background: on ? '#22c55e' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s', flexShrink: 0,
    }}
  >
    <span style={{ position: 'absolute', top: '3px', left: on ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
  </button>
);

export const SeverityBadge = ({ severity, label }: { severity: Severity; label?: string }) => {
  const s = SEVERITY[severity];
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.color}33`, borderRadius: '6px', padding: '2px 8px' }}>
      {label || s.label}
    </span>
  );
};

export const Problems = ({ items }: { items: { code?: string; severity: Severity; message: string }[] }) =>
  items.length ? (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((p, i) => (
        <li key={`${p.code || ''}-${i}`} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', lineHeight: 1.45, color: 'rgba(230,238,250,0.9)' }}>
          <span aria-hidden style={{ flexShrink: 0, width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', background: SEVERITY[p.severity].color }} />
          <span>{p.message}</span>
        </li>
      ))}
    </ul>
  ) : null;

/** Fond en damier : rend visible la transparence d'un logo. */
export const checkerboard: CSSProperties = {
  backgroundColor: '#e5e7eb',
  backgroundImage: 'linear-gradient(45deg,#cbd5e1 25%,transparent 25%),linear-gradient(-45deg,#cbd5e1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#cbd5e1 75%),linear-gradient(-45deg,transparent 75%,#cbd5e1 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
};

export const Card = ({ children }: { children: ReactNode }) => (
  <div style={{ ...PANEL, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>{children}</div>
);
