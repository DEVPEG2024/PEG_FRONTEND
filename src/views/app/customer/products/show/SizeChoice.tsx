import Input from '@/components/ui/Input';
import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import { DEFAULT_CHOICE } from './SizeAndColorsChoice';

const SizeChoice = ({product, sizeAndColorsSelected, color, handleSizeAndColorsChanged} : {product: Product, sizeAndColorsSelected: SizeAndColorSelection[], color?: Color, handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void}) => {
    const sizesOrder: string[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']

    return (
    <div className="grid grid-cols-7 gap-4 mb-6">
        {[...product.sizes].sort((a, b) => sizesOrder.indexOf(a.name) - sizesOrder.indexOf(b.name)).map((size) => (
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
