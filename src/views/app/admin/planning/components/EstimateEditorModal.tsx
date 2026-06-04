import { useState } from 'react';
import { toast } from 'react-toastify';
import { TbX } from 'react-icons/tb';
import { ScheduledProject } from '@/utils/planning/scheduler';
import { estimateWorkload } from '@/utils/planning/estimateWorkload';
import { apiSetPlanningEstimate, apiDeletePlanningEstimate } from '@/services/PlanningService';
import { PLANNING_ACCENT, rgba } from '../theme';

type Props = {
  item: ScheduledProject;
  /** documentId de l'admin qui modifie (pour l'audit) */
  updatedBy?: string;
  onClose: () => void;
  /** appelé après sauvegarde/reset pour rafraîchir la liste */
  onSaved: () => void;
};

const EstimateEditorModal = ({ item, updatedBy, onClose, onSaved }: Props) => {
  const auto = estimateWorkload(item.project); // estimation auto (sans override)
  const isManual = item.workload.source === 'manual';
  const [value, setValue] = useState<string>(isManual ? String(item.workload.days) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const manualDays = parseFloat(value);
    if (!value || isNaN(manualDays) || manualDays <= 0) {
      toast.error('Saisis une durée valide (jours-homme > 0)');
      return;
    }
    setBusy(true);
    try {
      await apiSetPlanningEstimate(item.project.documentId, { manualDays, note, updatedBy });
      toast.success('Durée enregistrée');
      onSaved();
      onClose();
    } catch {
      toast.error("Échec de l'enregistrement (backend Planning indisponible ?)");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await apiDeletePlanningEstimate(item.project.documentId);
      toast.success('Estimation automatique rétablie');
      onSaved();
      onClose();
    } catch {
      toast.error('Échec de la réinitialisation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '440px',
          maxWidth: 'calc(100vw - 32px)',
          background: 'linear-gradient(160deg, rgba(22,28,43,0.98), rgba(13,16,24,0.98))',
          border: `1px solid ${rgba(PLANNING_ACCENT, 0.3)}`,
          borderRadius: '16px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 800, margin: 0 }}>Durée estimée</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '2px 0 0' }}>{item.project.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
            <TbX size={20} />
          </button>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
            Estimation automatique : <strong style={{ color: '#fff' }}>{auto.days} j</strong>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>{auto.label}</div>
        </div>

        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>Durée manuelle (jours-homme)</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={String(auto.days)}
          style={{
            width: '100%',
            marginTop: '6px',
            marginBottom: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            padding: '10px 12px',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box',
          }}
        />

        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>Note (optionnel)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="ex : façonnage complexe, validation client longue…"
          style={{
            width: '100%',
            marginTop: '6px',
            marginBottom: '16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            padding: '10px 12px',
            color: '#fff',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            onClick={reset}
            disabled={busy || !isManual}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              padding: '9px 14px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: busy || !isManual ? 'default' : 'pointer',
              opacity: !isManual ? 0.4 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Réinitialiser auto
          </button>
          <button
            onClick={save}
            disabled={busy}
            style={{
              background: `linear-gradient(90deg, ${PLANNING_ACCENT}, #4f46e5)`,
              border: 'none',
              borderRadius: '10px',
              padding: '9px 18px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EstimateEditorModal;
