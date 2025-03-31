import Input from '@/components/ui/Input';
import { Color, Size, SizeAndColorSelection } from '@/@types/product';
import { DEFAULT_CHOICE } from './SizeAndColorsChoice';

const DefaultChoice = ({sizeAndColorsSelected, color, handleSizeAndColorsChanged} : {sizeAndColorsSelected: SizeAndColorSelection[], color?: Color, handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void}) => {
    
    const determineQuantitiesForColor = () => {
        if (color) {
            return sizeAndColorsSelected.filter((sizeAndColorSelected) => sizeAndColorSelected.color.value === color.value)
        }
        return sizeAndColorsSelected
    }
    
    return (
        <div className="flex-auto mt-8 flex-initial w-32">
        <span>Quantité</span>
        <Input
        name="Quantité"
        value={
            determineQuantitiesForColor().find(
            (sizeAndColorSelected) =>
                sizeAndColorSelected.size.value === 'DEFAULT'
            )?.quantity
        }
        type="number"
        autoComplete="off"
        onChange={(e: any) =>
            handleSizeAndColorsChanged(parseInt(e.target.value), DEFAULT_CHOICE as Size, color ?? DEFAULT_CHOICE as Color)
        }
        />
    </div>
  );
};

export default DefaultChoice;
