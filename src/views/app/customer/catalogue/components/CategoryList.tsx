import GridItem from './GridItem';
import { ProductCategory } from '@/@types/product';

const ProductCategoryListContent = ({
  productCategories,
}: {
  productCategories: ProductCategory[];
}) => {
  return (
    <div id="catalogue-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(230px, 100%), 1fr))',
      gap: '18px',
    }}>
      {productCategories.map((productCategory) => (
        <GridItem key={productCategory.documentId} data={productCategory} />
      ))}
    </div>
  );
};

export default ProductCategoryListContent;
