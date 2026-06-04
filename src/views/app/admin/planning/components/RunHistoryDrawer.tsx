import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { TbX, TbDeviceFloppy, TbTrash, TbHistory } from 'react-icons/tb';
import {
  apiGetPlanningRuns,
  apiCreatePlanningRun,
  apiDeletePlanningRun,
  PlanningRunSummary,
} from '@/services/PlanningService';
import { PlanningSnapshot } from '@/services/PlanningAIService';
import { RiskCounts } from '@/utils/planning/scheduler';
import { RISK_COLOR, PLANNING_ACCENT, rgba } from '../theme';

type Props = {
  counts: RiskCounts;
  snapshot: PlanningSnapshot;
  horizonWeeks: number;
  generatedBy?: string;
  onClose: () => void;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

const RunHistoryDrawer = ({ counts, snapshot, horizonWeeks, generatedBy, onClose }: Props) => {
  const [runs, setRuns] = useState<PlanningRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setRuns(await apiGetPlanningRuns(30));
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const run = await apiCreatePlanningRun({ label, horizonWeeks, generatedBy, counts, snapshot });
      setRuns((prev) => [run, ...prev]);
      setLabel('');
      toast.success('Planning sauvegardé');
    } catch {
      toast.error('Échec de la sauvegarde (backend Planning indisponible ?)');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await apiDeletePlanningRun(id);
      setRuns((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error('Échec de la suppression');
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000, fontFamily: 'Inter, sans-serif' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '460px', maxWidth: 'calc(100vw - 24px)', height: '100%', overflowY: 'auto', background: 'linear-gradient(160deg, rgba(18,22,34,0.99), rgba(11,14,21,0.99))', borderLeft: `1px solid ${rgba(PLANNING_ACCENT, 0.3)}`, padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <TbHistory size={20} color={PLANNING_ACCENT} /> Historique des plannings
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
            <TbX size={20} />
          </button>
        </div>

        {/* Sauvegarde du planning courant */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>Sauvegarder le planning actuel</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Libellé (optionnel)" style={{ ...field, flex: 1 }} />
            <button onClick={save} disabled={saving} style={{ background: `linear-gradient(90deg, ${PLANNING_ACCENT}, #4f46e5)`, border: 'none', borderRadius: '10px', padding: '9px 14px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'Inter, sans-serif', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <TbDeviceFloppy size={15} /> {saving ? '…' : 'Sauver'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Chargement…</div>
        ) : runs.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>
            Aucun planning sauvegardé.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {runs.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{r.label || `Run #${r.id}`}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{formatDate(r.created_at)} · {r.horizon_weeks} sem.</div>
                </div>
                <span style={{ display: 'inline-flex', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ color: RISK_COLOR.late }}>{r.counts?.late ?? 0}</span>
                  <span style={{ color: RISK_COLOR.tight }}>{r.counts?.tight ?? 0}</span>
                  <span style={{ color: RISK_COLOR.ok }}>{r.counts?.ok ?? 0}</span>
                </span>
                <button onClick={() => remove(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                  <TbTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RunHistoryDrawer;
