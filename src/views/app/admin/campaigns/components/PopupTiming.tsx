import { HiOutlineClock } from 'react-icons/hi';
import {
  POPUP_DAYS,
  POPUP_DEFAULT_DAYS,
  POPUP_DELAYS,
  POPUP_DURATIONS,
  daysLabel,
  delayLabel,
  durationLabel,
} from '@/utils/campaignFormat';
import { hintStyle, inputStyle, labelStyle } from '../ui';

/**
 * Réglages de la pop-up : quand elle s'ouvre, combien de temps elle reste à
 * l'écran, pendant combien de jours elle est proposée.
 */

type Patch = { popupDelay?: number; popupDuration?: number | null; popupDays?: number | null };

// Une valeur enregistrée hors des choix proposés reste sélectionnable.
const withValue = <T,>(list: T[], v: T) => (list.includes(v) ? list : [...list, v]);
const enc = (v: number | null) => (v == null ? '' : String(v));
const dec = (v: string) => (v === '' ? null : Number(v));

const Select = ({ label, value, options, render, onChange }: {
  label: string;
  value: number | null;
  options: (number | null)[];
  render: (v: number | null) => string;
  onChange: (v: number | null) => void;
}) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
    <span style={labelStyle}>{label}</span>
    <select aria-label={`Pop-up : ${label.toLowerCase()}`} value={enc(value)} onChange={(e) => onChange(dec(e.target.value))} style={{ ...inputStyle, appearance: 'auto', fontSize: '13px' }}>
      {withValue(options, value).map((o) => (
        <option key={enc(o)} value={enc(o)} style={{ color: '#000' }}>{render(o)}</option>
      ))}
    </select>
  </label>
);

const PopupTiming = ({ delay, duration, days, onChange }: { delay: number; duration: number | null; days: number | null; onChange: (p: Patch) => void }) => (
  <div style={{ marginLeft: '32px', background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93c5fd', fontSize: '12px', fontWeight: 600 }}>
      <HiOutlineClock size={14} /> Temps d’apparition de la pop-up
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
      <Select
        label="S’ouvre"
        value={delay}
        options={POPUP_DELAYS}
        render={(v) => (v ? `Après ${delayLabel(v).replace(/^après /, '')} sur l’application` : 'Dès l’arrivée sur l’application')}
        onChange={(v) => onChange({ popupDelay: v ?? 0 })}
      />
      <Select
        label="Reste affichée"
        value={duration}
        options={POPUP_DURATIONS}
        render={(v) => (v == null ? 'Jusqu’à ce que le client la ferme' : durationLabel(v).replace('se ferme seule après', 'Pendant'))}
        onChange={(v) => onChange({ popupDuration: v })}
      />
      <Select
        label="Proposée pendant"
        value={days}
        options={POPUP_DAYS}
        render={(v) => (v == null ? `${POPUP_DEFAULT_DAYS} jours (par défaut)` : `${v} jour${v > 1 ? 's' : ''}`)}
        onChange={(v) => onChange({ popupDays: v })}
      />
    </div>
    <span style={hintStyle}>
      Le client la voit {delayLabel(delay)} sur l’application ; elle {duration == null ? 'reste ouverte jusqu’à ce qu’il la ferme' : `${durationLabel(duration)} (le décompte s’interrompt s’il la survole)`}.
      Un client qui ne s’est pas connecté dans les {daysLabel(days)} ne la verra plus en pop-up, seulement dans Actualités.
    </span>
  </div>
);

export default PopupTiming;
