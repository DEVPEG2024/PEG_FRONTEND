import classNames from 'classnames';
import ProductCategoryCard from './ProductCategoryCard';
import { ProductCategory } from '@/@types/product';

const ProductCategoriesListContent = ({
  productCategories,
  handleDeleteProductCategory,
}: {
  productCategories: ProductCategory[];
  handleDeleteProductCategory: (productCategory: ProductCategory) => void;
}) => {
  return (
    <div className={classNames('mt-6 h-full flex flex-col')}>
      <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {productCategories.map((productCategory) => (
          <ProductCategoryCard
            key={productCategory.documentId}
            productCategory={productCategory}
            handleDeleteProductCategory={handleDeleteProductCategory}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductCategoriesListContent;
