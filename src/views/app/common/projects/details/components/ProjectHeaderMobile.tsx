/*
 * En-tête du détail d'un projet — rendu TÉLÉPHONE uniquement (< md).
 *
 * Il prolonge la carte de la liste (ProjectCardMobile, classes `peg-pcard*`
 * de _mobile.css) : même photo en tête avec le statut posé dessus, mêmes
 * couleurs bleu nuit et barre au statut (choix de Nova pour les cartes),
 * puis le nom en grand, l'échéance, l'avancement et les intervenants.
 * Les onglets (ProjectTabsMobile) deviennent une barre accrochée sous
 * l'en-tête de l'app : ProjectDetails la pose entre l'en-tête et le contenu,
 * car un élément collant ne tient que dans son bloc parent.
 *
 * Composant d'AFFICHAGE : ProjectHeader garde la logique (changement de
 * statut et ses confirmations, attribution, modale d'édition).
 */
import type { CSSProperties, ReactNode } from 'react';
import { MdAccessTime } from 'react-icons/md';
import { HiArrowLeft, HiOutlineEye, HiOutlinePencil, HiPhotograph } from 'react-icons/hi';
import ProgressionBar from '../../lists/components/ProgressionBar';

type Pill = { label: string; color: string; bg: string; border: string };

type Props = {
  name: string;
  image: string | null;
  status: Pill;
  priority?: Pill;
  deadline?: { label: string; late: boolean };
  lastSeen?: string;
  progress: { percent: number; label: string };
  people: ReactNode;
  onBack: () => void;
  /** Admin : modifier le projet */
  onEdit?: () => void;
  /** Admin, projet sans commande : ajouter / changer la photo */
  photo?: { label: string; busy: boolean; onPick: () => void; input: ReactNode };
  /** Producteur non attribué */
  onAssign?: () => void;
  /** Admin : rangée « Statut du projet » (écrit en base, confirmations comprises) */
  statusControl?: ReactNode;
};

const CSS = `
.peg-pd { padding: 12px 16px 0; font-family: Inter, sans-serif; }
.peg-pd-back {
  display: inline-flex; align-items: center; gap: 6px; margin: 0 0 12px; padding: 6px 12px 6px 8px;
  border-radius: 100px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.75); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.peg-pd-hero .peg-pcard-media { height: 230px; cursor: default; }
.peg-pd-hero .peg-pcard-body { cursor: default; gap: 14px; padding: 16px 16px 18px; }
.peg-pd-edit {
  position: absolute; top: 10px; right: 10px; z-index: 2; width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  background: rgba(7, 10, 8, 0.72); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.14); color: #fff; cursor: pointer;
}
.peg-pd-title {
  margin: 0; color: #fff; font-size: 23px; font-weight: 800; line-height: 1.18;
  letter-spacing: -0.025em; overflow-wrap: anywhere;
}
.peg-pd-progress-label {
  display: flex; justify-content: space-between; margin-bottom: 6px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255, 255, 255, 0.4);
}
.peg-pd-people {
  display: flex; flex-wrap: wrap; gap: 12px 18px; padding-top: 14px;
  border-top: 1px solid var(--pcard-sep, rgba(255, 255, 255, 0.07));
}
.peg-pd-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.peg-pd-action {
  display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 100px;
  border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.06);
  color: #fff; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer;
}
.peg-pd-action.is-primary {
  border-color: transparent; background: var(--pdm-accent, #c6f432); color: var(--pdm-on-accent, #10140a);
}
.peg-pd-status { margin-top: 14px; }
.peg-pd-status > div { margin-bottom: 0 !important; }
/* Onglets accrochés sous l'en-tête de l'app (collant, 64px + barre d'état)
   pendant le défilement. */
.peg-pd-tabs {
  position: sticky; top: calc(64px + var(--peg-safe-top, 0px)); z-index: 20; margin-top: 14px; padding: 10px 16px;
  background: rgba(7, 10, 8, 0.9); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
`;

const ProjectHeaderMobile = ({
  name,
  image,
  status,
  priority,
  deadline,
  lastSeen,
  progress,
  people,
  onBack,
  onEdit,
  photo,
  onAssign,
  statusControl,
}: Props) => (
  <div className="peg-pd">
    <style>{CSS}</style>

    <button type="button" className="peg-pd-back" onClick={onBack}>
      <HiArrowLeft /> Projets
    </button>

    <article
      className="peg-pcard peg-pd-hero"
      style={
        {
          '--pcard-bar': status.color,
          '--pcard-line': `${status.color}35`,
          '--pcard-sep': `${status.color}25`,
        } as CSSProperties
      }
    >
      <div className={image ? 'peg-pcard-media' : 'peg-pcard-media is-empty'}>
        {image ? (
          <img src={image} alt={name} decoding="async" />
        ) : (
          <img className="is-placeholder" src="/img/others/project-default.svg" alt={name} />
        )}
      </div>

      <div className="peg-pcard-badges">
        <span className="peg-pcard-pill" style={{ color: status.color, borderColor: status.border }}>
          {status.label}
        </span>
        {priority && (
          <span className="peg-pcard-pill" style={{ color: priority.color, borderColor: priority.border }}>
            {priority.label}
          </span>
        )}
      </div>
      {onEdit && (
        <button type="button" className="peg-pd-edit" onClick={onEdit} aria-label="Modifier le projet">
          <HiOutlinePencil />
        </button>
      )}

      <div className="peg-pcard-body">
        <h1 className="peg-pd-title">{name}</h1>

        {(deadline || lastSeen) && (
          <div className="peg-pcard-meta">
            {deadline && (
              <span className={deadline.late ? 'peg-pcard-fact is-late' : 'peg-pcard-fact'}>
                <MdAccessTime aria-hidden="true" />
                {deadline.label}
              </span>
            )}
            {lastSeen && (
              <span className="peg-pcard-fact is-seen">
                <HiOutlineEye aria-hidden="true" />
                {lastSeen}
              </span>
            )}
          </div>
        )}

        <div>
          <div className="peg-pd-progress-label">
            <span>Avancement</span>
            <span>{progress.label}</span>
          </div>
          <ProgressionBar progression={progress.percent} />
        </div>

        {(photo || onAssign) && (
          <div className="peg-pd-actions">
            {onAssign && (
              <button type="button" className="peg-pd-action is-primary" onClick={onAssign}>
                M'assigner ce projet
              </button>
            )}
            {photo && (
              <button type="button" className="peg-pd-action" onClick={photo.onPick} disabled={photo.busy}>
                <HiPhotograph /> {photo.busy ? 'Envoi…' : photo.label}
              </button>
            )}
            {photo?.input}
          </div>
        )}

        <div className="peg-pd-people">{people}</div>
      </div>
    </article>

    {statusControl && <div className="peg-pd-status">{statusControl}</div>}
  </div>
);

/** Barre d'onglets du téléphone (styles ci-dessus, rendus avec l'en-tête). */
export const ProjectTabsMobile = ({ children }: { children: ReactNode }) => (
  <nav className="peg-pd-tabs" aria-label="Sections du projet">{children}</nav>
);

export default ProjectHeaderMobile;
