import Input from '@/components/ui/Input';
import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import { DEFAULT_CHOICE } from './SizeAndColorsChoice';

const SizeChoice = ({
  product,
  sizeAndColorsSelected,
  color,
  handleSizeAndColorsChanged,
}: {
  product: Product;
  sizeAndColorsSelected: SizeAndColorSelection[];
  color?: Color;
  handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void;
}) => {
  const sizesOrder: string[] = [
    'XS',
    'S',
    'M',
    'L',
    'XL',
    '2XL',
    '3XL',
    '4XL',
    '5XL',
  ];

  const sorted = [...product.sizes].sort(
    (a, b) => sizesOrder.indexOf(a.name) - sizesOrder.indexOf(b.name)
  );

  const total = sizeAndColorsSelected
    .filter((s) => !color || s.color.value === color.value)
    .reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(160,185,220,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
        Quantités par taille
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '8px' }}>
        {sorted.map((size) => {
          const qty = sizeAndColorsSelected.find(
            (s) => s.size.value === size.value && (!color || s.color.value === color.value)
          )?.quantity ?? 0;
          const active = qty > 0;
          return (
            <div
              key={size.value}
              style={{
                background: active ? 'rgba(47,111,237,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? 'rgba(47,111,237,0.45)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '10px',
                padding: '10px 6px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: active ? '#7eb3ff' : 'rgba(160,185,220,0.7)', letterSpacing: '0.03em' }}>
                {size.name}
              </span>
              <Input
                name={size.value}
                value={qty || ''}
                placeholder="0"
                type="number"
                autoComplete="off"
                style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', padding: '4px 2px', borderRadius: '6px' }}
                onChange={(e: any) =>
                  handleSizeAndColorsChanged(
                    parseInt(e.target.value) || 0,
                    size,
                    color ?? (DEFAULT_CHOICE as Color)
                  )
                }
              />
            </div>
          );
        })}
      </div>
      {total > 0 && (
        <p style={{ margin: 0, fontSize: '13px', color: '#7eb3ff', fontWeight: 600 }}>
          {total} pièce{total > 1 ? 's' : ''} sélectionnée{total > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default SizeChoice;
