import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { MdPlayArrow, MdRefresh, MdTune } from 'react-icons/md';
import {
  AgentId,
  AgentReview,
  AgentStatus,
  AgentStatusValue,
  apiAcceptAgentReview,
  apiAgentAction,
  apiGetAgentReviews,
  apiGetAgentStatus,
  apiRejectAgentReview,
  apiRevertAgentReview,
  apiRunAgent,
  apiUpdateAgentSettings,
} from '@/services/AgentServices';
import { PANEL, Toggle, btn, errorMessage, fmtDate, inputStyle, labelStyle, mutedText } from './agentUi';

/**
 * Écran commun des agents IA de fond : réglages, chiffres, onglets, liste.
 * Chaque agent fournit ses onglets, ses options et le rendu d'une entrée.
 */

export type AgentTab = { key: string; label: string; statuses: AgentStatusValue[]; empty: string };
export type AgentOption = { key: string; label: string; hint?: string; type: 'boolean' | 'percent' | 'number'; unit?: string; min?: number; max?: number };
export type AgentStat = { label: string; value: string; hint?: string; tone?: 'danger' | 'warning' | 'ok' };

export type CardApi = {
  busy: boolean;
  accept: (input?: Record<string, any>, ok?: string) => Promise<void>;
  reject: (ok?: string) => Promise<void>;
  revert: (ok?: string) => Promise<void>;
  action: (name: string, input?: Record<string, any>, ok?: string) => Promise<void>;
  rerun: () => Promise<void>;
};

type Props = {
  agent: AgentId;
  icon: ReactNode;
  title: string;
  subtitle: string;
  schedule: string;
  tabs: AgentTab[];
  options: AgentOption[];
  stats: (s: AgentStatus) => AgentStat[];
  banner?: (s: AgentStatus) => ReactNode;
  budgetLabel?: string;
  renderReview: (review: AgentReview, api: CardApi) => ReactNode;
};

const TONE = { danger: '#f87171', warning: '#fbbf24', ok: '#4ade80' };

const AgentShell = ({ agent, icon, title, subtitle, schedule, tabs, options, stats, banner, budgetLabel, renderReview }: Props) => {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [tab, setTab] = useState(tabs[0].key);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const current = tabs.find((t) => t.key === tab) || tabs[0];

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([apiGetAgentStatus(agent), apiGetAgentReviews(agent, current.statuses)]);
      setStatus(s.data.status);
      setReviews(r.data.reviews || []);
    } catch (e: any) {
      toast.error(errorMessage(e, 'Agent indisponible (backend pas encore déployé ?)'));
    } finally {
      setLoading(false);
    }
  }, [agent, current.statuses]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Rafraîchissement pendant une passe en cours
  useEffect(() => {
    if (!status?.running && !status?.queued) return;
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [status?.running, status?.queued, load]);

  const updateSettings = async (patch: { enabled?: boolean; options?: Record<string, any> }) => {
    try {
      await apiUpdateAgentSettings(agent, patch);
      await load();
    } catch (e: any) {
      toast.error(errorMessage(e, 'Réglage non enregistré'));
    }
  };

  const run = async () => {
    try {
      const res = await apiRunAgent(agent);
      toast.info(res.data.started ? 'Examen lancé en arrière-plan' : 'Un examen est déjà en cours');
      load();
    } catch (e: any) {
      toast.error(errorMessage(e, 'Examen non lancé'));
    }
  };

  const cardApi = (r: AgentReview): CardApi => {
    const wrap = async (fn: () => Promise<unknown>, ok: string) => {
      setBusyId(r.id);
      try {
        await fn();
        toast.success(ok);
      } catch (e: any) {
        toast.error(errorMessage(e, 'Action impossible'));
      } finally {
        setBusyId(null);
        load();
      }
    };
    return {
      busy: busyId === r.id,
      accept: (input, ok = 'Proposition appliquée') => wrap(() => apiAcceptAgentReview(agent, r.id, input), ok),
      reject: (ok = 'Entrée classée') => wrap(() => apiRejectAgentReview(agent, r.id), ok),
      revert: (ok = 'Modification annulée') => wrap(() => apiRevertAgentReview(agent, r.id), ok),
      action: (name, input, ok = 'C’est fait') => wrap(() => apiAgentAction(agent, r.id, name, input), ok),
      rerun: () => wrap(() => apiRunAgent(agent, r.targetId.split('#')[0]), 'Nouvel examen lancé'),
    };
  };

  const counts = status?.byStatus || {};
  const summary = status?.lastRunSummary;
  const opts = status?.options || {};

  return (
    <div style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>{title}</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '2px 0 0' }}>{subtitle}</p>
        </div>
      </div>

      {status && banner?.(status)}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px' }}>
        <div style={{ ...PANEL, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle label="Agent actif" on={!!status?.enabled} disabled={!status} onChange={(v) => updateSettings({ enabled: v })} />
            <div>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{status?.enabled ? 'Agent actif' : 'Agent en pause'}</div>
              <div style={mutedText}>{schedule}</div>
            </div>
          </div>
          <button type="button" style={{ ...btn('rgba(255,255,255,0.7)'), alignSelf: 'flex-start' }} onClick={() => setShowOptions((v) => !v)} aria-expanded={showOptions}>
            <MdTune size={15} /> Réglages de l’agent
          </button>
        </div>

        {status && stats(status).map((s) => (
          <div key={s.label} style={{ ...PANEL, padding: '14px 16px' }}>
            <div style={labelStyle}>{s.label}</div>
            <div style={{ color: s.tone ? TONE[s.tone] : '#fff', fontSize: '26px', fontWeight: 700, marginTop: '6px' }}>{s.value}</div>
            {s.hint && <div style={mutedText}>{s.hint}</div>}
          </div>
        ))}

        <div style={{ ...PANEL, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={labelStyle}>Dernière passe complète</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
            {status?.running
              ? `En cours… (${status.queued} en file)`
              : summary
                ? `${fmtDate(status?.lastRunAt)} · ${summary.examinees} examiné(s), ${summary.appliquees} appliqué(s), ${summary.propositions} proposition(s), ${summary.signalements} signalement(s)${summary.arret ? ` · arrêtée : ${summary.arret}` : ''}`
                : 'Jamais lancée'}
          </div>
          {!!status?.dailyBudget && (
            <div style={mutedText}>{budgetLabel || 'Appels IA'} aujourd’hui : {status.usageToday} / {status.dailyBudget}</div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" style={btn('#60a5fa')} disabled={!status || status.running} onClick={run}>
              <MdPlayArrow size={16} /> Lancer maintenant
            </button>
            <button type="button" style={btn('rgba(255,255,255,0.6)')} onClick={() => load()} aria-label="Rafraîchir">
              <MdRefresh size={16} />
            </button>
          </div>
        </div>
      </div>

      {showOptions && status && (
        <div style={{ ...PANEL, padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {options.map((o) => (
            <label key={o.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{o.label}</span>
              {o.type === 'boolean' ? (
                <Toggle label={o.label} on={!!opts[o.key]} onChange={(v) => updateSettings({ options: { [o.key]: v } })} />
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    defaultValue={opts[o.key]}
                    min={o.min}
                    max={o.max}
                    style={{ ...inputStyle, width: '110px' }}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v !== opts[o.key]) updateSettings({ options: { [o.key]: v } });
                    }}
                  />
                  <span style={mutedText}>{o.unit || (o.type === 'percent' ? '%' : '')}</span>
                </span>
              )}
              {o.hint && <span style={mutedText}>{o.hint}</span>}
            </label>
          ))}
        </div>
      )}

      <div role="tablist" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {tabs.map((t) => {
          const n = t.statuses.reduce((sum, st) => sum + (counts[st] || 0), 0);
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              style={{
                ...btn(active ? '#fff' : 'rgba(255,255,255,0.6)'),
                background: active ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.04)',
                borderColor: active ? 'rgba(96,165,250,0.45)' : 'rgba(255,255,255,0.1)',
              }}
            >
              {t.label}{t.statuses.length && n ? ` (${n})` : ''}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={mutedText}>Chargement…</div>
      ) : reviews.length === 0 ? (
        <div style={{ ...PANEL, padding: '28px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{current.empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reviews.map((r) => <div key={r.id}>{renderReview(r, cardApi(r))}</div>)}
        </div>
      )}
    </div>
  );
};

export default AgentShell;
