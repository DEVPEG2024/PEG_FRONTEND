import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import ColorChoice from './ColorChoice';
import QuantityChoice from './DefaultChoice';
import SizeChoice from './SizeChoice';

export const DEFAULT_CHOICE = {
    name: 'Default',
    value: 'DEFAULT',
    description: 'Default',
}

const SizeAndColorsChoice = ({product, sizeAndColorsSelected, handleSizeAndColorsChanged} : {product: Product, sizeAndColorsSelected: SizeAndColorSelection[], handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void}) => {
    if (product.colors?.length > 0) {
        return (
            <div>
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
    } else if (product.sizes.length > 0) {
        <SizeChoice
            product={product}
            sizeAndColorsSelected={sizeAndColorsSelected}
            handleSizeAndColorsChanged={handleSizeAndColorsChanged}
        />
    }
    return (
        <QuantityChoice
            sizeAndColorsSelected={sizeAndColorsSelected}
            handleSizeAndColorsChanged={handleSizeAndColorsChanged}
        />
    );
};

export default SizeAndColorsChoice;
