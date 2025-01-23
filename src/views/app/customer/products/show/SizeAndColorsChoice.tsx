import Input from '@/components/ui/Input';
import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import ColorChoice from './ColorChoice';

export const DEFAULT_CHOICE = {
    name: 'Default',
    value: 'DEFAULT',
    description: 'Default',
}

const SizeAndColorsChoice = ({product, sizeAndColorsSelected, handleSizeAndColorsChanged} : {product: Product, sizeAndColorsSelected: SizeAndColorSelection[], handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void}) => {
    if (product.sizes.length > 0) {
        return (
            <div>
            <p className="font-bold text-yellow-500 mb-4">
                Choix des tailles
            </p>
            <ColorChoice
                product={product}
                sizeAndColorsSelected={sizeAndColorsSelected}
                handleSizeAndColorsChanged={handleSizeAndColorsChanged}
            />
            {sizeAndColorsSelected.length === 0 && (
                <p className="mt-4 text-green-600">
                Veuillez renseigner au moins une taille
                </p>
            )}
            </div>
        )
    }
  return (
    <div className="flex-auto mt-8 flex-initial w-32">
        <span>Quantité</span>
        <Input
        name="Quantité"
        value={
            sizeAndColorsSelected.find(
            (sizeAndColorSelected) =>
                sizeAndColorSelected.size.value === 'DEFAULT'
            )?.quantity
        }
        type="number"
        autoComplete="off"
        onChange={(e: any) =>
            handleSizeAndColorsChanged(parseInt(e.target.value), DEFAULT_CHOICE as Size, DEFAULT_CHOICE as Color)
        }
        />
    </div>
  );
};

export default SizeAndColorsChoice;
