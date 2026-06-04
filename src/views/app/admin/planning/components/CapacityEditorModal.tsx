import { useState } from 'react';
import { toast } from 'react-toastify';
import { TbX, TbPlus, TbTrash } from 'react-icons/tb';
import { apiSetProducerCapacity, CapacityConfig } from '@/services/PlanningService';
import { PLANNING_ACCENT, rgba } from '../theme';

type Props = {
  producerId: string;
  producerName: string;
  current?: CapacityConfig;
  onClose: () => void;
  onSaved: () => void;
};

const WEEKDAYS = [
  { v: 1, l: 'Lun' },
  { v: 2, l: 'Mar' },
  { v: 3, l: 'Mer' },
  { v: 4, l: 'Jeu' },
  { v: 5, l: 'Ven' },
  { v: 6, l: 'Sam' },
  { v: 0, l: 'Dim' },
];

const CapacityEditorModal = ({ producerId, producerName, current, onClose, onSaved }: Props) => {
  const [daily, setDaily] = useState<string>(String(current?.dailyCapacityDays ?? 1));
  const [offDays, setOffDays] = useState<number[]>(current?.weeklyOffDays ?? []);
  const [dates, setDates] = useState<string[]>(current?.unavailableDates ?? []);
  const [newDate, setNewDate] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleOff = (v: number) =>
    setOffDays((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const addDate = () => {
    if (newDate && !dates.includes(newDate)) setDates((prev) => [...prev, newDate].sort());
    setNewDate('');
  };

  const save = async () => {
    const dailyCapacityDays = parseFloat(daily);
    if (isNaN(dailyCapacityDays) || dailyCapacityDays < 0) {
      toast.error('Capacité/jour invalide');
      return;
    }
    if ([1, 2, 3, 4, 5].every((d) => offDays.includes(d))) {
      toast.error('Au moins un jour ouvré (Lun→Ven) doit rester travaillé');
      return;
    }
    setBusy(true);
    try {
      await apiSetProducerCapacity(producerId, {
        dailyCapacityDays,
        weeklyOffDays: offDays,
        unavailableDates: dates,
      });
      toast.success('Capacité enregistrée');
      onSaved();
      onClose();
    } catch {
      toast.error('Échec de l\'enregistrement (backend Planning indisponible ?)');
    } finally {
      setBusy(false);
    }
  };

  const field: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    padding: '9px 11px',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, fontFamily: 'Inter, sans-serif' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '460px', maxWidth: 'calc(100vw - 32px)', background: 'linear-gradient(160deg, rgba(22,28,43,0.98), rgba(13,16,24,0.98))', border: `1px solid ${rgba(PLANNING_ACCENT, 0.3)}`, borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 800, margin: 0 }}>Capacité de production</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '2px 0 0' }}>{producerName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
            <TbX size={20} />
          </button>
        </div>

        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>Capacité par jour ouvré (jours-homme)</label>
        <input type="number" min="0" step="0.5" value={daily} onChange={(e) => setDaily(e.target.value)} style={{ ...field, width: '100%', marginTop: '6px', marginBottom: '16px' }} />

        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>Jours non travaillés (hebdo)</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px', marginBottom: '16px' }}>
          {WEEKDAYS.map((d) => {
            const active = offDays.includes(d.v);
            return (
              <button
                key={d.v}
                onClick={() => toggleOff(d.v)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  background: active ? rgba('#ef4444', 0.18) : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? rgba('#ef4444', 0.4) : 'rgba(255,255,255,0.12)'}`,
                  color: active ? '#fca5a5' : 'rgba(255,255,255,0.6)',
                }}
              >
                {d.l}
              </button>
            );
          })}
        </div>

        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>Congés / indisponibilités ponctuelles</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', marginBottom: '8px' }}>
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ ...field, flex: 1 }} />
          <button onClick={addDate} disabled={!newDate} style={{ ...field, cursor: newDate ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#c7d2fe', opacity: newDate ? 1 : 0.5 }}>
            <TbPlus size={14} /> Ajouter
          </button>
        </div>
        {dates.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {dates.map((d) => (
              <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', padding: '3px 6px 3px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                {d}
                <button onClick={() => setDates((prev) => prev.filter((x) => x !== d))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'inline-flex' }}>
                  <TbTrash size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '9px 14px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Annuler
          </button>
          <button onClick={save} disabled={busy} style={{ background: `linear-gradient(90deg, ${PLANNING_ACCENT}, #4f46e5)`, border: 'none', borderRadius: '10px', padding: '9px 18px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'Inter, sans-serif' }}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CapacityEditorModal;
