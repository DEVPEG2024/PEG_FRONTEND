import { useState } from 'react';
import { TbSparkles, TbRefresh } from 'react-icons/tb';
import { PlanningSnapshot, apiPlanningSummary, localSummary } from '@/services/PlanningAIService';
import { PLANNING_ACCENT, rgba } from '../theme';

type Props = { snapshot: PlanningSnapshot };

const AiSummary = ({ snapshot }: Props) => {
  // Affichage immédiat du résumé déterministe ; l'IA raffine à la demande.
  const [text, setText] = useState<string>(() => localSummary(snapshot));
  const [refined, setRefined] = useState(false);
  const [loading, setLoading] = useState(false);

  const refine = async () => {
    setLoading(true);
    try {
      const reply = await apiPlanningSummary(snapshot);
      setText(reply);
      setRefined(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${rgba(PLANNING_ACCENT, 0.12)}, rgba(13,16,24,0.92))`,
        border: `1px solid ${rgba(PLANNING_ACCENT, 0.3)}`,
        borderRadius: '14px',
        padding: '16px 18px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#c7d2fe', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <TbSparkles size={16} /> Analyse {refined ? 'IA' : 'rapide'}
        </span>
        <button
          onClick={refine}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: rgba(PLANNING_ACCENT, 0.16),
            border: `1px solid ${rgba(PLANNING_ACCENT, 0.4)}`,
            borderRadius: '10px',
            padding: '6px 12px',
            color: '#c7d2fe',
            fontSize: '12px',
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            fontFamily: 'Inter, sans-serif',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <TbRefresh size={13} /> {loading ? 'Analyse…' : refined ? 'Régénérer' : 'Affiner avec l’IA'}
        </button>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    </div>
  );
};

export default AiSummary;
