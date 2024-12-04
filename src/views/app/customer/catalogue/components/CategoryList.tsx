import classNames from 'classnames';
import GridItem from './GridItem';
import { ProductCategory } from '@/@types/product';

const ProductCategoryListContent = ({
  productCategories,
}: {
  productCategories: ProductCategory[];
}) => {
  return (
    <div className={classNames('mt-6 h-full flex flex-col')}>
      <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {productCategories.map((productCategory) => (
          <GridItem key={productCategory.documentId} data={productCategory} />
        ))}
      </div>
    </div>
  );
};

export default ProductCategoryListContent;
