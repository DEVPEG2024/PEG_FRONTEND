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
      gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
      gap: '20px',
    }}>
      {productCategories.map((productCategory) => (
        <GridItem key={productCategory.documentId} data={productCategory} />
      ))}
    </div>
  );
};

export default ProductCategoryListContent;
