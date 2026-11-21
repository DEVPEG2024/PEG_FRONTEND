import type { OfferSpec } from '@/@types/masterPrint';
import type { OfferStock } from '@/@types/offerStock';
import {
  displayedSizes,
  sizeNote,
  sizeState,
  type SizeNote,
} from '@/utils/offerStock';
import { C, Label, Stepper, Swatch } from './ui';

/*
 * Formulaire d'une offre configurable — affichage du stock du textile.
 * Taille épuisée : champ désactivé « Épuisé » ; stock faible : « Plus que N » ;
 * quantité au-delà du stock : message sous la taille (l'ajout au panier est
 * bloqué par OfferConfigurator via `stockBlocker`). Aucun nom de fournisseur.
 * Règles : src/utils/offerStock.ts.
 */

const NOTE_COLOR: Record<SizeNote['tone'], string> = {
  error: C.error,
  warn: C.warn,
  info: C.accentText,
};

/** Taille épuisée (aucune quantité saisie) : même hauteur qu'un champ de quantité. */
const SoldOutSize = ({ size }: { size: string }) => (
  <div>
    <Label>{size}</Label>
    <div
      role="note"
      aria-label={`Taille ${size} épuisée`}
      style={{
        height: '40px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px dashed ${C.border}`,
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.02)',
        color: C.faint,
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'not-allowed',
      }}
    >
      Épuisé
    </div>
  </div>
);

/** Tailles × quantités du coloris choisi, avec le stock. */
export const StockSizeGrid = ({
  spec,
  stock,
  color,
  sizes,
  onChange,
}: {
  spec: OfferSpec;
  stock: OfferStock | null;
  color: string | undefined;
  sizes: Record<string, number> | undefined;
  onChange: (size: string, quantity: number) => void;
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
      gap: '10px',
    }}
  >
    {displayedSizes(spec, stock, color).map((s) => {
      const qty = Number(sizes?.[s] || 0);
      const state = sizeState(spec, stock, color, s);
      if (state.kind === 'soldOut' && qty <= 0)
        return <SoldOutSize key={s} size={s} />;
      const note = sizeNote(stock, color, s, state, qty);
      return (
        <div key={s}>
          <Stepper
            label={s}
            ariaLabel={`Taille ${s}`}
            value={qty}
            onChange={(n) => onChange(s, n)}
          />
          {note && (
            <p
              role={note.tone === 'error' ? 'alert' : undefined}
              style={{
                margin: '5px 0 0',
                fontSize: '11px',
                lineHeight: 1.3,
                fontWeight: note.tone === 'error' ? 700 : 600,
                color: NOTE_COLOR[note.tone],
              }}
            >
              {note.text}
            </p>
          )}
        </div>
      );
    })}
  </div>
);

/** Pastille d'un coloris épuisé : grisée et barrée. */
export const SoldOutSwatch = ({ hex }: { hex: string | null }) => (
  <span
    style={{
      position: 'relative',
      display: 'inline-flex',
      opacity: 0.4,
    }}
  >
    <Swatch hex={hex} />
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '-3px',
        bottom: '-3px',
        width: '2px',
        borderRadius: '2px',
        background: 'rgba(240,244,255,0.9)',
        transform: 'translateX(-50%) rotate(45deg)',
      }}
    />
  </span>
);
