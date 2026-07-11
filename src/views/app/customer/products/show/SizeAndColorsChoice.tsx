import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import ColorChoice from './ColorChoice';
import QuantityChoice from './DefaultChoice';
import SizeChoice from './SizeChoice';
import { compareSizes } from '@/utils/sizeSort';

export const DEFAULT_CHOICE = {
  name: 'Default',
  value: 'DEFAULT',
  description: 'Default',
};

type ColorGroup = {
  color: Color;
  total: number;
  sizes: { size: Size; qty: number }[];
};

/**
 * Récapitulatif visuel des sélections : une pastille par couleur choisie
 * (rond de la couleur + nom + nombre total), avec le détail par taille.
 * S'accumule à travers les onglets de couleur — le client voit tout d'un coup.
 */
const SelectionRecap = ({
  product,
  sizeAndColorsSelected,
}: {
  product: Product;
  sizeAndColorsSelected: SizeAndColorSelection[];
}) => {
  const hasColors = (product.colors?.length ?? 0) > 0;
  const hasSizes = (product.sizes?.length ?? 0) > 0;

  // Regroupe par couleur, en ne gardant que les quantités > 0
  const groupsMap = new Map<string, ColorGroup>();
  for (const sel of sizeAndColorsSelected) {
    if (!sel || sel.quantity <= 0) continue;
    const key = sel.color?.value ?? 'DEFAULT';
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { color: sel.color ?? (DEFAULT_CHOICE as Color), total: 0, sizes: [] });
    }
    const g = groupsMap.get(key)!;
    g.total += sel.quantity;
    g.sizes.push({ size: sel.size, qty: sel.quantity });
  }
  const groups = [...groupsMap.values()].map((g) => ({
    ...g,
    sizes: [...g.sizes].sort((a, b) => compareSizes(a.size, b.size)),
  }));

  if (groups.length === 0) return null;

  const grandTotal = groups.reduce((sum, g) => sum + g.total, 0);
  const isRealColor = (c: Color) => hasColors && c.value !== 'DEFAULT';

  return (
    <div
      style={{
        marginTop: '18px',
        padding: '14px 16px',
        borderRadius: '14px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p
        style={{
          margin: '0 0 10px',
          fontSize: '11px',
          color: 'rgba(160,185,220,0.6)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 700,
        }}
      >
        Votre sélection
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {groups.map((g) => (
          <div
            key={g.color.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '7px 12px 7px 9px',
              borderRadius: '100px',
              background: 'rgba(47,111,237,0.10)',
              border: '1px solid rgba(47,111,237,0.30)',
            }}
          >
            {isRealColor(g.color) && (
              <span
                title={g.color.name}
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: g.color.value || '#aaa',
                  border: '2px solid rgba(255,255,255,0.35)',
                  flexShrink: 0,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
                }}
              />
            )}
            {isRealColor(g.color) && (
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                {g.color.name}
              </span>
            )}

            {/* Détail par taille (si le produit a des tailles) */}
            {hasSizes && (
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {g.sizes
                  .filter((s) => s.size?.value !== 'DEFAULT')
                  .map((s) => (
                    <span
                      key={s.size.value}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#a0b9dc',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        padding: '1px 7px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.size.name}
                      <span style={{ color: '#7eb3ff', fontWeight: 800 }}> ×{s.qty}</span>
                    </span>
                  ))}
              </span>
            )}

            {/* Badge total (toujours affiché : total couleur, ou total tout court) */}
            <span
              style={{
                marginLeft: '2px',
                minWidth: '26px',
                height: '22px',
                padding: '0 8px',
                borderRadius: '100px',
                background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(47,111,237,0.4)',
              }}
            >
              ×{g.total}
            </span>
          </div>
        ))}
      </div>

      <p style={{ margin: '10px 0 0', fontSize: '13px', color: 'rgba(160,185,220,0.55)' }}>
        Total :{' '}
        <span style={{ color: '#7eb3ff', fontWeight: 800 }}>{grandTotal}</span> pièce
        {grandTotal > 1 ? 's' : ''}
      </p>
    </div>
  );
};

const SizeAndColorsChoice = ({
  product,
  sizeAndColorsSelected,
  handleSizeAndColorsChanged,
}: {
  product: Product;
  sizeAndColorsSelected: SizeAndColorSelection[];
  handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void;
}) => {
  const recap = (
    <SelectionRecap product={product} sizeAndColorsSelected={sizeAndColorsSelected} />
  );

  if (product.colors?.length > 0) {
    return (
      <div>
        <ColorChoice
          product={product}
          sizeAndColorsSelected={sizeAndColorsSelected}
          handleSizeAndColorsChanged={handleSizeAndColorsChanged}
        />
        {sizeAndColorsSelected.length === 0 && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#4ade80' }}>
            Veuillez renseigner au moins une taille
          </p>
        )}
        {recap}
      </div>
    );
  }
  if (product.sizes?.length > 0) {
    return (
      <div>
        <SizeChoice
          product={product}
          sizeAndColorsSelected={sizeAndColorsSelected}
          handleSizeAndColorsChanged={handleSizeAndColorsChanged}
        />
        {recap}
      </div>
    );
  }
  return (
    <div>
      <QuantityChoice
        product={product}
        sizeAndColorsSelected={sizeAndColorsSelected}
        handleSizeAndColorsChanged={handleSizeAndColorsChanged}
      />
      {recap}
    </div>
  );
};

export default SizeAndColorsChoice;
