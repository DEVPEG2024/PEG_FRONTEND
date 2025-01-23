import { Color, Product, Size, SizeAndColorSelection } from '@/@types/product';
import { Tabs } from '@/components/ui';
import SizeChoice from './SizeChoice';

const { TabNav, TabList, TabContent } = Tabs;

const ColorChoice = ({product, sizeAndColorsSelected, handleSizeAndColorsChanged} : {product: Product, sizeAndColorsSelected: SizeAndColorSelection[], handleSizeAndColorsChanged: (value: number, size: Size, color: Color) => void}) => {
    if (product.colors?.length > 0) {
        return (
            <Tabs defaultValue={product.colors[0].value}>
                <TabList>
                {product.colors.map((color) => (
                    <TabNav key={color.value} value={color.value}>
                        <span className="text-sm font-semibold text-gray-100">
                            {color.name}
                        </span>
                    </TabNav>
                ))}
                </TabList>
                <div className="p-4">
                    {product.colors.map((color) => (
                        <TabContent value={color.value} key={color.value}>
                            <SizeChoice
                                product={product}
                                sizeAndColorsSelected={sizeAndColorsSelected}
                                color={color}
                                handleSizeAndColorsChanged={handleSizeAndColorsChanged}
                            />
                        </TabContent>
                    ))}
                </div>
            </Tabs>
        )
    }
  return (
    <SizeChoice
        product={product}
        sizeAndColorsSelected={sizeAndColorsSelected}
        handleSizeAndColorsChanged={handleSizeAndColorsChanged}
    />
  );
};

export default ColorChoice;
