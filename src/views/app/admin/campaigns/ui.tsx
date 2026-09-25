import type { CampaignStatus } from '@/@types/campaign';
import { STATUS_META } from '@/utils/campaignFormat';

/** Styles partagés des écrans Campagnes (mêmes codes que l'écran Relecture). */

export const PANEL: React.CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
};

export const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

export const hintStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.5 };

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '10px 12px',
  color: '#fff',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

export const btn = (color: string, filled = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  background: filled ? color : 'rgba(255,255,255,0.04)',
  border: `1px solid ${filled ? color : 'rgba(255,255,255,0.12)'}`,
  color: filled ? '#fff' : color,
  borderRadius: '8px', padding: '8px 13px',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', textDecoration: 'none',
});

export const chip = (active: boolean, color = '#60a5fa'): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: active ? `${color}26` : 'rgba(255,255,255,0.04)',
  border: `1px solid ${active ? `${color}80` : 'rgba(255,255,255,0.1)'}`,
  color: active ? '#fff' : 'rgba(255,255,255,0.65)',
  borderRadius: '100px', padding: '6px 12px',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
});

export const Toggle = ({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    style={{
      width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative',
      background: on ? '#22c55e' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s', flexShrink: 0, opacity: disabled ? 0.55 : 1,
    }}
  >
    <span style={{ position: 'absolute', top: '3px', left: on ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
  </button>
);

export const StatusBadge = ({ status, archived }: { status: CampaignStatus; archived?: boolean }) => {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: meta.color, whiteSpace: 'nowrap' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: meta.color }} />
      {meta.label}{archived ? ' · archivée' : ''}
    </span>
  );
};

export const Kpi = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) => (
  <div className="peg-kpi" style={{ ...PANEL, padding: '14px 16px', minWidth: 0, ['--peg-kpi-accent' as string]: accent || '#8b5cf6' }}>
    <div className="peg-kpi-label" style={labelStyle}>{label}</div>
    <div className="peg-kpi-value" style={{ color: accent || '#fff', fontSize: '26px', fontWeight: 700, marginTop: '6px', lineHeight: 1.1 }}>{value}</div>
    {sub && <div className="peg-kpi-hint" style={{ ...hintStyle, marginTop: '4px' }}>{sub}</div>}
  </div>
);

/** Barre de progression fine (taux d'ouverture sur les cartes). */
export const RateBar = ({ rate, color }: { rate: number; color: string }) => (
  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(100, Math.max(0, rate * 100))}%`, height: '100%', background: color, borderRadius: '3px' }} />
  </div>
);

export const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || e?.response?.data?.error?.message || fallback;

/** Route absente (backend pas encore déployé) : 404/405 sur /campaigns/*. */
export const isBackendMissing = (e: any) => [404, 405].includes(e?.response?.status) && !e?.response?.data?.message;
