import type { CSSProperties } from 'react';
import { shownBadges, type ProductBadge } from '@/utils/productBadges';
import useProductBadges from '@/utils/hooks/useProductBadges';

type Props = {
  /** Badges déjà connus (aperçu de l'éditeur admin)… */
  badges?: ProductBadge[] | unknown;
  /** …sinon lus pour ce produit (requête regroupée, cf. ProductBadgeServices). */
  documentId?: string | null;
  /** `stack` : posés sur l'image d'une carte ; `row` : au-dessus d'un titre. */
  layout?: 'stack' | 'row';
  size?: 'sm' | 'md';
  /** Badges à ne pas montrer (ex. « Nouveau » déjà affiché par la carte). */
  hide?: string[];
  style?: CSSProperties;
};

/**
 * Petites étiquettes « Nouveau », « Promo »… posées par l'admin sur un produit.
 * Rien n'est rendu sans badge valable aujourd'hui (date de fin dépassée = masqué).
 */
const ProductBadges = ({ badges, documentId, layout = 'stack', size = 'sm', hide, style }: Props) => {
  const loaded = useProductBadges(badges === undefined ? documentId : null);
  const shown = shownBadges(badges === undefined ? loaded : badges).filter((b) => !hide?.includes(b.kind));
  if (!shown.length) return null;
  const sm = size === 'sm';
  return (
    <div
      className="peg-product-badges"
      style={{
        display: 'flex',
        flexDirection: layout === 'stack' ? 'column' : 'row',
        flexWrap: layout === 'row' ? 'wrap' : 'nowrap',
        alignItems: 'flex-start',
        gap: sm ? '4px' : '6px',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {shown.map((b) => (
        <span
          key={b.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            maxWidth: '100%',
            padding: sm ? '3px 9px' : '5px 12px',
            borderRadius: '999px',
            background: b.color,
            color: b.text,
            fontSize: sm ? '10.5px' : '12px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
};

export default ProductBadges;
