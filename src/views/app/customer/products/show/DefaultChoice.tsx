import Input from '@/components/ui/Input';
import { Color, Size, SizeAndColorSelection } from '@/@types/product';
import { DEFAULT_CHOICE } from './SizeAndColorsChoice';

const DefaultChoice = ({
  sizeAndColorsSelected,
  color,
  handleSizeAndColorsChanged,
}: {
  sizeAndColorsSelected: SizeAndColorSelection[];
  color?: Color;
  handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void;
}) => {
  const determineQuantitiesForColor = () => {
    if (color) {
      return sizeAndColorsSelected.filter(
        (sizeAndColorSelected) =>
          sizeAndColorSelected.color.value === color.value
      );
    }
    return sizeAndColorsSelected;
  };

  const qty = determineQuantitiesForColor().find(
    (s) => s.size.value === 'DEFAULT'
  )?.quantity ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(160,185,220,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
        Quantité
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          background: qty > 0 ? 'rgba(47,111,237,0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${qty > 0 ? 'rgba(47,111,237,0.45)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '10px',
          padding: '6px 10px',
          width: '110px',
          transition: 'all 0.15s',
        }}>
          <Input
            name="Quantité"
            value={qty || ''}
            placeholder="0"
            type="number"
            autoComplete="off"
            style={{ textAlign: 'center', fontWeight: 700, fontSize: '18px', background: 'transparent', border: 'none', padding: '2px' }}
            onChange={(e: any) =>
              handleSizeAndColorsChanged(
                parseInt(e.target.value) || 0,
                DEFAULT_CHOICE as Size,
                color ?? (DEFAULT_CHOICE as Color)
              )
            }
          />
        </div>
        {qty > 0 && (
          <span style={{ fontSize: '13px', color: '#7eb3ff', fontWeight: 600 }}>
            {qty} pièce{qty > 1 ? 's' : ''} sélectionnée{qty > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export default DefaultChoice;
