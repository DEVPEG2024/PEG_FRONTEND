// Frise « Où en sont vos offres » (vue preparing). Aucun délai promis.
import type { ReactNode } from 'react';
import { TbCheck } from 'react-icons/tb';
import { EvenGrid, IconTile, PULSE_CLASS } from './offersUi';

type StepState = 'done' | 'current' | 'upcoming';

const STATE_LABEL: Record<StepState, string> = {
  done: 'Terminé',
  current: 'En cours',
  upcoming: 'À venir',
};

const STATE_COLOR: Record<StepState, string> = {
  done: '#34d399',
  current: '#a99bff',
  upcoming: 'rgba(255,255,255,0.3)',
};

const StepMarker = ({ state }: { state: StepState }) => {
  if (state === 'done') {
    return (
      <IconTile size={28} radius={999} background="rgba(52,211,153,0.14)">
        <TbCheck size={16} color="#34d399" />
      </IconTile>
    );
  }
  const color = STATE_COLOR[state];
  return (
    <IconTile
      size={28}
      radius={999}
      background={
        state === 'current' ? 'rgba(169,155,255,0.14)' : 'transparent'
      }
      border={`1px solid ${state === 'current' ? 'rgba(169,155,255,0.35)' : color}`}
    >
      <span
        className={state === 'current' ? PULSE_CLASS : undefined}
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '999px',
          background: color,
          animation:
            state === 'current' ? 'pulse 1.5s ease-in-out infinite' : undefined,
        }}
      />
    </IconTile>
  );
};

const Step = ({
  state,
  title,
  children,
}: {
  state: StepState;
  title: string;
  children: ReactNode;
}) => (
  <li
    aria-current={state === 'current' ? 'step' : undefined}
    style={{
      listStyle: 'none',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      padding: '16px',
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.015)',
      border: `1px solid ${
        state === 'current' ? 'rgba(169,155,255,0.3)' : 'rgba(255,255,255,0.06)'
      }`,
    }}
  >
    <StepMarker state={state} />
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          margin: 0,
          fontSize: '11.5px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: state === 'upcoming' ? '#94a3b8' : STATE_COLOR[state],
        }}
      >
        {STATE_LABEL[state]}
      </p>
      <p
        style={{
          margin: '4px 0 0',
          color: state === 'upcoming' ? 'rgba(255,255,255,0.75)' : '#fff',
          fontSize: '14px',
          fontWeight: 700,
        }}
      >
        {title}
      </p>
      <p
        className="peg-text-secondary"
        style={{ margin: '4px 0 0', fontSize: '12.5px', lineHeight: 1.45 }}
      >
        {children}
      </p>
    </div>
  </li>
);

const OffersProgressSteps = ({ sinceLabel }: { sinceLabel: string }) => (
  // Jamais « 2 + 1 » : l'étape « À venir » ne se retrouve pas seule en bas.
  <EvenGrid
    as="ol"
    cols={3}
    ariaLabel="Où en sont vos offres"
    style={{ marginTop: '20px' }}
  >
    <Step state="done" title="Abonnement Premium activé">
      {sinceLabel ? `Le ${sinceLabel}.` : 'Votre abonnement est actif.'}
    </Step>
    <Step state="current" title="Préparation par l’équipe PEG">
      Sélection des produits et des tarifs pour votre entreprise.
    </Step>
    <Step state="upcoming" title="Vos offres sur cette page">
      Vous pourrez les consulter et les commander directement.
    </Step>
  </EvenGrid>
);

export default OffersProgressSteps;
