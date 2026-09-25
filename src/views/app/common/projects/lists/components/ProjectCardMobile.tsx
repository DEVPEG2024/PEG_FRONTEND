import type { CSSProperties, ReactNode } from 'react';
import { MdAccessTime } from 'react-icons/md';
import { HiOutlineEye } from 'react-icons/hi';
import ProgressionBar from './ProgressionBar';

/*
 * Carte projet — rendu TÉLÉPHONE uniquement (< md), mise en page des
 * tableaux de bord téléphone (demande Nova du 25/09/2026) : photo pleine
 * largeur, statut posé sur la photo, montant en grand. Couleurs de la carte
 * d'ordinateur (bleu nuit, bordure et barre au statut), à la demande de Nova.
 * Composant d'AFFICHAGE : ProjectItem calcule tout (statut, délai, avancement,
 * montants selon le rôle) et passe des valeurs prêtes — mêmes informations et
 * mêmes libellés que la carte d'ordinateur. Styles : « CARTES PROJET » de
 * _mobile.css.
 */

type Pill = { label: string; color: string; bg: string; border: string };

type Props = {
  name: string;
  image?: string;
  status: Pill;
  priority?: Pill;
  deadline?: { label: string; late: boolean };
  lastSeen?: string;
  progress: number;
  people: ReactNode;
  price?: {
    amount: string;
    title?: string;
    withAdditionalSales?: boolean;
    sub?: string;
  };
  menu?: ReactNode;
  onOpen: () => void;
};

const ProjectCardMobile = ({
  name,
  image,
  status,
  priority,
  deadline,
  lastSeen,
  progress,
  people,
  price,
  menu,
  onOpen,
}: Props) => (
  <article
    className="peg-pcard"
    // Couleurs de la carte d'ordinateur : bordure, barre et filet au statut
    style={
      {
        '--pcard-bar': status.color,
        '--pcard-line': `${status.color}35`,
        '--pcard-sep': `${status.color}25`,
      } as CSSProperties
    }
  >
    <div
      className={image ? 'peg-pcard-media' : 'peg-pcard-media is-empty'}
      onClick={onOpen}
    >
      {image ? (
        <img src={image} alt={name} loading="lazy" decoding="async" />
      ) : (
        <img
          className="is-placeholder"
          src="/img/others/project-default.svg"
          alt={name}
        />
      )}
    </div>

    <div className="peg-pcard-badges">
      <span
        className="peg-pcard-pill"
        style={{ color: status.color, borderColor: status.border }}
      >
        {status.label}
      </span>
      {priority && (
        <span
          className="peg-pcard-pill"
          style={{ color: priority.color, borderColor: priority.border }}
        >
          {priority.label}
        </span>
      )}
    </div>
    {menu && <div className="peg-pcard-menu">{menu}</div>}

    <div className="peg-pcard-body" onClick={onOpen}>
      <button type="button" className="peg-pcard-title">
        {name}
      </button>

      {(deadline || lastSeen) && (
        <div className="peg-pcard-meta">
          {deadline && (
            <span
              className={
                deadline.late ? 'peg-pcard-fact is-late' : 'peg-pcard-fact'
              }
            >
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

      <ProgressionBar progression={progress} />

      <div className="peg-pcard-foot">
        <div className="peg-pcard-people">{people}</div>
        {price && (
          <div className="peg-pcard-price" title={price.title}>
            <span className="peg-pcard-amount">
              {price.amount}
              {price.withAdditionalSales && (
                <span className="peg-pcard-va">+VA</span>
              )}
            </span>
            {price.sub && <span className="peg-pcard-sub">{price.sub}</span>}
          </div>
        )}
      </div>
    </div>
  </article>
);

export default ProjectCardMobile;
