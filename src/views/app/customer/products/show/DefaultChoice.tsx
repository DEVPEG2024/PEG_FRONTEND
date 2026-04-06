import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import { DEFAULT_CHOICE } from './SizeAndColorsChoice';
import { getProductPackOptions, isProductPackPricing } from '@/utils/productHelpers';

const DefaultChoice = ({
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
  const determineQuantitiesForColor = () => {
    if (color) {
      return sizeAndColorsSelected.filter((s) => s.color.value === color.value);
    }
    return sizeAndColorsSelected;
  };

  const qty = determineQuantitiesForColor().find(
    (s) => s.size.value === 'DEFAULT'
  )?.quantity ?? 0;

  const onChange = (v: number) =>
    handleSizeAndColorsChanged(
      Math.max(0, v),
      DEFAULT_CHOICE as Size,
      color ?? (DEFAULT_CHOICE as Color)
    );

  const isPackPricing = isProductPackPricing(product);

  // In pack mode, selection is done via the tier pricing table above
  if (isPackPricing) {
    return qty > 0 ? (
      <span style={{ fontSize: '13px', color: '#7eb3ff', fontWeight: 700 }}>
        Pack {qty} sélectionné
      </span>
    ) : null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(160,185,220,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
        Quantité souhaitée
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Stepper */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: qty > 0 ? 'rgba(47,111,237,0.10)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${qty > 0 ? 'rgba(47,111,237,0.35)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '10px',
          overflow: 'hidden',
          transition: 'all 0.15s',
        }}>
          <button
            type="button"
            onClick={() => onChange(qty - 1)}
            style={{ width: '36px', height: '44px', background: 'rgba(255,255,255,0.04)', border: 'none', borderRight: '1px solid rgba(255,255,255,0.07)', color: '#a0b9dc', cursor: 'pointer', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            value={qty === 0 ? '' : qty}
            placeholder="0"
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            style={{ width: '60px', height: '44px', border: 'none', background: 'transparent', color: qty > 0 ? '#7eb3ff' : 'rgba(160,185,220,0.6)', textAlign: 'center', fontWeight: 800, fontSize: '20px', outline: 'none' }}
          />
          <button
            type="button"
            onClick={() => onChange(qty + 1)}
            style={{ width: '36px', height: '44px', background: 'rgba(255,255,255,0.04)', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.07)', color: '#a0b9dc', cursor: 'pointer', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            +
          </button>
        </div>
        {qty > 0 && (
          <span style={{ fontSize: '13px', color: 'rgba(160,185,220,0.5)' }}>
            <span style={{ color: '#7eb3ff', fontWeight: 700 }}>{qty}</span> pièce{qty > 1 ? 's' : ''} sélectionnée{qty > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export default DefaultChoice;
