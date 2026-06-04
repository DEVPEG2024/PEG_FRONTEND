import classNames from 'classnames';
import ProductCategoryCard from './ProductCategoryCard';
import { ProductCategory } from '@/@types/product';

const ProductCategoriesListContent = ({
  productCategories,
  handleEditProductCategory,
  handleDeleteProductCategory,
  handleActivateProductCategory,
  handleAddSubcategory,
}: {
  productCategories: ProductCategory[];
  handleEditProductCategory: (productCategory: ProductCategory) => void;
  handleDeleteProductCategory: (productCategory: ProductCategory) => void;
  handleActivateProductCategory: (
    productCategory: ProductCategory,
    active: boolean
  ) => void;
  handleAddSubcategory?: (parent: ProductCategory) => void;
}) => {
  return (
    <div className={classNames('mt-6 h-full flex flex-col')}>
      <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {productCategories.map((productCategory) => (
          <ProductCategoryCard
            key={productCategory.documentId}
            productCategory={productCategory}
            handleDeleteProductCategory={handleDeleteProductCategory}
            handleEditProductCategory={handleEditProductCategory}
            handleActivateProductCategory={handleActivateProductCategory}
            handleAddSubcategory={handleAddSubcategory}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductCategoriesListContent;
