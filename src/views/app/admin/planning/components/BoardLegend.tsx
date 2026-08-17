import { TbHelpCircle, TbChevronDown } from 'react-icons/tb';
import { HOURS_PER_DAY, FLASH_HOURS_PER_DAY } from '@/utils/planning/scheduler';
import { PLANNING_ACCENT, RISK_COLOR, rgba } from '../theme';

type Props = {
  /** Heures/jour du mode courant (4 h normal, 16 h en Flash). */
  dayHours: number;
  open: boolean;
  onToggle: () => void;
};

const Swatch = ({ style, children }: { style: React.CSSProperties; children: React.ReactNode }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
    <span style={{ width: '13px', height: '13px', borderRadius: '3px', flexShrink: 0, ...style }} />
    {children}
  </span>
);

/**
 * Légende du board. L'essentiel reste visible en permanence ; le modèle de
 * calcul (qui expliquait autrefois une ligne dense et illisible) passe dans un
 * panneau « Comment lire ce planning ? » dépliable.
 */
const BoardLegend = ({ dayHours, open, onToggle }: Props) => (
  <div style={{ marginBottom: '10px' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
      <span style={{ color: 'rgba(255,255,255,0.45)' }}>
        🧩 1 carré = <strong style={{ color: '#fff' }}>30 min</strong>
      </span>
      <Swatch style={{ background: PLANNING_ACCENT }}>occupé (1 couleur = 1 projet)</Swatch>
      <Swatch style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}>libre</Swatch>
      <Swatch style={{ background: PLANNING_ACCENT, boxShadow: `0 0 0 1.5px ${RISK_COLOR.late}` }}>
        au-delà de la capacité ({dayHours} h/j)
      </Swatch>
      <span style={{ color: '#c7d2fe', fontWeight: 600 }}>👉 clique un jour pour voir les tâches</span>

      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: open ? rgba(PLANNING_ACCENT, 0.16) : 'transparent',
          border: `1px solid ${rgba(PLANNING_ACCENT, open ? 0.4 : 0.2)}`,
          borderRadius: '8px', padding: '4px 9px',
          color: '#c7d2fe', fontSize: '11.5px', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}
      >
        <TbHelpCircle size={13} /> Comment lire ce planning ?
        <TbChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
    </div>

    {open && (
      <div style={{
        marginTop: '10px',
        background: 'linear-gradient(160deg, rgba(18,22,34,0.7), rgba(11,14,21,0.7))',
        border: `1px solid ${rgba(PLANNING_ACCENT, 0.22)}`,
        borderRadius: '12px', padding: '14px 16px',
        color: 'rgba(255,255,255,0.7)', fontSize: '12.5px', lineHeight: 1.65,
      }}>
        <p style={{ margin: '0 0 8px' }}>
          <strong style={{ color: '#fff' }}>D'où vient la charge ?</strong> Chaque projet actif reçoit une durée
          estimée en jours-homme : durée saisie manuellement si elle existe, sinon le délai moyen du producteur,
          sinon le nombre de tâches restantes, sinon une valeur par défaut. Le crayon dans « Projets à risque »
          permet de corriger cette estimation — c'est le principal levier de justesse de l'outil.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong style={{ color: '#fff' }}>Comment est-elle répartie ?</strong> Un jour-homme vaut{' '}
          {HOURS_PER_DAY} h de travail effectif. Cet effort est étalé uniformément, par tranches de 30 min, sur
          les jours ouvrés disponibles entre aujourd'hui et l'échéance (hors week-ends, jours off et congés du
          producteur). Un projet dont l'échéance est dépassée est replanifié dès le prochain jour disponible,
          au rythme de la capacité quotidienne.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong style={{ color: '#fff' }}>Le mode Flash</strong> répond à « et si on fonçait ? » : au lieu
          d'étaler, il compacte tout au plus tôt en journées de {FLASH_HOURS_PER_DAY} h pour montrer la date de
          fin la plus précoce atteignable.
        </p>
        <p style={{ margin: 0 }}>
          <strong style={{ color: '#fff' }}>Charge des producteurs :</strong>{' '}
          <span style={{ color: '#34d399' }}>🌱 libre</span> ·{' '}
          <span style={{ color: RISK_COLOR.ok }}>😌 tranquille (&lt; 70 %)</span> ·{' '}
          <span style={{ color: RISK_COLOR.tight }}>⚡ chargé (70–100 %)</span> ·{' '}
          <span style={{ color: RISK_COLOR.late }}>🔥 surchargé (&gt; 100 %)</span>.
          Le pourcentage porte sur la période affichée et tient compte des congés déclarés.
        </p>
      </div>
    )}
  </div>
);

export default BoardLegend;
