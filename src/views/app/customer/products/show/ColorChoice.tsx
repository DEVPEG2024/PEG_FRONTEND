import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import { Tabs } from '@/components/ui';
import { useTabs } from '@/components/ui/Tabs/context';
import { HiCheck } from 'react-icons/hi';
import SizeChoice from './SizeChoice';
import DefaultChoice from './DefaultChoice';

const { TabContent } = Tabs;

// Couleur claire (blanc, jaune…) → coche foncée pour rester visible sur la pastille
const isLightColor = (hex?: string): boolean => {
  if (!hex) return false;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.7;
};

/**
 * Barre de sélection de couleur : chaque couleur est une pastille avec son vrai
 * échantillon. La couleur ACTIVE est nettement mise en avant (fond bleu, anneau
 * lumineux, texte blanc gras, coche) pour qu'on la repère au premier coup d'œil.
 * Consomme le contexte `Tabs` (partagé) sans modifier le composant global.
 */
const ColorTabBar = ({ colors }: { colors: Color[] }) => {
  const { value, onValueChange } = useTabs();
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '2px 0' }}>
        {colors.map((color) => {
          const selected = color.value === value;
          return (
            <button
              key={color.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onValueChange?.(color.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '9px',
                padding: '7px 15px 7px 9px',
                borderRadius: '100px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                transform: selected ? 'translateY(-1px)' : 'none',
                background: selected ? 'rgba(47,111,237,0.20)' : 'rgba(255,255,255,0.03)',
                border: selected ? '1.5px solid rgba(47,111,237,0.75)' : '1.5px solid rgba(255,255,255,0.09)',
                boxShadow: selected
                  ? '0 0 0 3px rgba(47,111,237,0.18), 0 6px 18px rgba(47,111,237,0.30)'
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                }
              }}
            >
              {/* Échantillon de couleur réel */}
              <span
                style={{
                  width: selected ? '22px' : '17px',
                  height: selected ? '22px' : '17px',
                  borderRadius: '50%',
                  background: color.value || '#888',
                  border: selected ? '2px solid #fff' : '2px solid rgba(255,255,255,0.55)',
                  boxShadow: selected
                    ? '0 0 0 2px rgba(47,111,237,0.6), 0 0 8px rgba(0,0,0,0.35)'
                    : '0 0 0 1px rgba(0,0,0,0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {selected && <HiCheck size={13} color={isLightColor(color.value) ? '#111' : '#fff'} />}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: selected ? 800 : 600,
                  color: selected ? '#fff' : 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.03em',
                }}
              >
                {color.name}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '12px 0 4px' }} />
    </>
  );
};

const ColorChoice = ({
  product,
  sizeAndColorsSelected,
  handleSizeAndColorsChanged,
}: {
  product: Product;
  sizeAndColorsSelected: SizeAndColorSelection[];
  handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void;
}) => {
  return (
    <Tabs defaultValue={product.colors[0].value}>
      <ColorTabBar colors={product.colors} />
      <div className="p-4">
        {product.colors.map((color) => (
          <TabContent value={color.value} key={color.value}>
            {product.sizes?.length > 0 ? (
              <SizeChoice
                key={color.value}
                product={product}
                sizeAndColorsSelected={sizeAndColorsSelected}
                color={color}
                handleSizeAndColorsChanged={handleSizeAndColorsChanged}
              />
            ) : (
              <DefaultChoice
                product={product}
                sizeAndColorsSelected={sizeAndColorsSelected}
                color={color}
                handleSizeAndColorsChanged={handleSizeAndColorsChanged}
              />
            )}
          </TabContent>
        ))}
      </div>
    </Tabs>
  );
};

export default ColorChoice;
