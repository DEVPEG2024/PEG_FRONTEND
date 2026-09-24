import { useEffect } from 'react';
import { HiArrowRight } from 'react-icons/hi';
import useResponsive from '@/utils/hooks/useResponsive';
import { fmtHT, fmtTTC, toTTC } from '@/utils/priceHelpers';

/*
 * Barre d'action de la fiche produit, sur téléphone : total en direct + étape
 * suivante, fixée au-dessus de la barre d'onglets. Sans elle, le bouton
 * « Récapitulatif » n'arrivait qu'après les tailles ET toute la description
 * (mesuré : 4 558 px de page sur une chaussure à 9 pointures).
 * `peg-has-actionbar` sur le body agrandit --peg-dock-lift : bulle d'aide,
 * retour en haut et fin de page passent au-dessus d'elle (_mobile.css).
 */
type Props = {
  canGoNext: boolean;
  onNext: () => void;
  label: string;
  unitPrice: number;
  unitLabel: string;
  total: number;
  /** « 3 pièces », « Pack 50 », « 1,20 m² × 2 »… ; null tant que rien n'est choisi */
  summary: string | null;
};

const ProductActionBar = ({
  canGoNext,
  onNext,
  label,
  unitPrice,
  unitLabel,
  total,
  summary,
}: Props) => {
  const { smaller } = useResponsive();
  const visible = smaller.md;

  useEffect(() => {
    if (!visible) return;
    document.body.classList.add('peg-has-actionbar');
    return () => document.body.classList.remove('peg-has-actionbar');
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="peg-product-bar" role="region" aria-label="Commande">
      <div className="peg-product-bar-sum" aria-live="polite">
        {canGoNext && summary ? (
          <>
            <strong>{fmtHT(total)}</strong>
            <span>
              {summary} · {fmtTTC(toTTC(total))}
            </span>
          </>
        ) : (
          <>
            <strong>
              {fmtHT(unitPrice)} <small>{unitLabel}</small>
            </strong>
            <span>Choisissez vos quantités</span>
          </>
        )}
      </div>
      <button
        type="button"
        className="peg-product-bar-cta"
        disabled={!canGoNext}
        onClick={onNext}
      >
        {label} <HiArrowRight size={15} />
      </button>
    </div>
  );
};

export default ProductActionBar;
