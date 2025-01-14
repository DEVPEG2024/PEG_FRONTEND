import Card from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';

const ProductCategoryCard = ({
  productCategory,
  handleDeleteProductCategory,
}: {
  productCategory: ProductCategory;
  handleDeleteProductCategory: (productCategory: ProductCategory) => void;
}) => {
  const navigate = useNavigate();

  return (
    <Card bodyClass=" bg-gray-900 rounded-lg project-card justify-center items-center">
      <div className="flex flex-col justify-center items-center">
        <a
          className="cursor-pointer"
          onClick={() =>
            navigate(`/admin/products/categories/${productCategory.documentId}`)
          }
        >
          <h6 className="flex flex-col justify-center flex-grow items-center gap-2">
            <img
              src={productCategory.image?.url}
              alt={productCategory.image?.name}
              className="w-30 h-30 rounded-full"
            />
            {productCategory.name}
          </h6>
        </a>
        <div className="flex items-center justify-center  mt-2">
          <div className="flex items-center rounded-full font-semibold text-xs">
            <div
              className={`flex items-center px-2 py-1 border-2 border-gray-300 rounded-full`}
            >
              <span className="ml-1 rtl:mr-1 whitespace-nowrapn text-white">
                {productCategory.products.length} produits
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-4">
        <Button
          variant="twoTone"
          onClick={() => handleDeleteProductCategory(productCategory)}
        >
          Supprimer
        </Button>
      </div>
    </Card>
  );
};

export default ProductCategoryCard;
