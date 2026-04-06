import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import { DEFAULT_CHOICE } from './SizeAndColorsChoice';
import { getProductPackOptions, isProductPackPricing } from '@/utils/productHelpers';

const sizesOrder: string[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

const Stepper = ({
  value,
  onChange,
  active,
}: {
  value: number;
  onChange: (v: number) => void;
  active: boolean;
}) => {
  const btnStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    width: '26px',
    height: '28px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: side === 'left' ? '6px 0 0 6px' : '0 6px 6px 0',
    background: 'rgba(255,255,255,0.05)',
    color: '#a0b9dc',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button type="button" style={btnStyle('left')} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? '' : value}
        placeholder="0"
        onChange={(e) => {
          const v = parseInt(e.target.value) || 0;
          onChange(Math.max(0, v));
        }}
        style={{
          width: '34px',
          height: '28px',
          border: '1px solid rgba(255,255,255,0.1)',
          borderLeft: 'none',
          borderRight: 'none',
          background: active ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.04)',
          color: active ? '#7eb3ff' : 'rgba(160,185,220,0.8)',
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '13px',
          outline: 'none',
        }}
      />
      <button type="button" style={btnStyle('right')} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
};

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
  const sorted = [...product.sizes].sort(
    (a, b) => sizesOrder.indexOf(a.name) - sizesOrder.indexOf(b.name)
  );

  const total = sizeAndColorsSelected
    .filter((s) => !color || s.color.value === color.value)
    .reduce((sum, s) => sum + s.quantity, 0);
  const packOptions = getProductPackOptions(product);
  const canShowPackSelection = isProductPackPricing(product);
  const activeSelection = sizeAndColorsSelected.find(
    (s) => !color || s.color.value === color.value
  );
  const defaultSize = activeSelection?.size ?? sorted[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {canShowPackSelection && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {packOptions.map((packSize) => {
            const active = total === packSize;
            return (
              <button
                key={packSize}
                type="button"
                onClick={() => handleSizeAndColorsChanged(
                  packSize,
                  defaultSize,
                  color ?? (DEFAULT_CHOICE as Color)
                )}
                style={{
                  minWidth: '110px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `1px solid ${active ? 'rgba(47,111,237,0.65)' : 'rgba(255,255,255,0.12)'}`,
                  background: active ? 'rgba(47,111,237,0.16)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#dbeafe' : 'rgba(160,185,220,0.8)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  transition: 'all 0.15s',
                }}
              >
                Pack {packSize}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {sorted.map((size) => {
          const qty = sizeAndColorsSelected.find(
            (s) => s.size.value === size.value && (!color || s.color.value === color.value)
          )?.quantity ?? 0;
          const active = qty > 0;
          return (
            <div
              key={size.value}
              style={{
                background: active ? 'rgba(47,111,237,0.10)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(47,111,237,0.35)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '10px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                transition: 'border-color 0.15s, background 0.15s',
                minWidth: '72px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: active ? '#7eb3ff' : 'rgba(160,185,220,0.6)', letterSpacing: '0.04em' }}>
                {size.name}
              </span>
              <Stepper
                value={qty}
                active={active}
                onChange={(v) => handleSizeAndColorsChanged(v, size, color ?? (DEFAULT_CHOICE as Color))}
              />
            </div>
          );
        })}
      </div>
      {total > 0 && (
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(160,185,220,0.5)' }}>
          <span style={{ color: '#7eb3ff', fontWeight: 700 }}>{total}</span> pièce{total > 1 ? 's' : ''} sélectionnée{total > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

export default SizeChoice;
