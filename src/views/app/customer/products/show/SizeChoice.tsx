import Input from '@/components/ui/Input';
import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import { DEFAULT_CHOICE } from './SizeAndColorsChoice';

const SizeChoice = ({product, sizeAndColorsSelected, color, handleSizeAndColorsChanged} : {product: Product, sizeAndColorsSelected: SizeAndColorSelection[], color?: Color, handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void}) => {
  return (
    <div className="grid grid-cols-7 gap-4 mb-6">
        {product.sizes.map((size) => (
        <div key={size.value} className="grid gap-4">
            <span>{size.name}</span>
            <Input
            name={size.value}
            value={
                sizeAndColorsSelected.find(
                (sizeAndColorSelected) =>
                    sizeAndColorSelected.size.value === size.value && (!color ||sizeAndColorSelected.color.value === color.value)
                )?.quantity
            }
            type="number"
            autoComplete="off"
            onChange={(e: any) =>
                handleSizeAndColorsChanged(
                parseInt(e.target.value),
                size,
                color ?? DEFAULT_CHOICE as Color
                )
            }
            />
        </div>
        ))}
    </div>
  );
};

export default SizeChoice;
