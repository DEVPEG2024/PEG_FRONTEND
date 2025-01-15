import { injectReducer } from '@/store';
import reducer, {
  useAppDispatch,
  useAppSelector,
  getCatalogueProductsByCategory,
  getCatalogueProductCategoryById,
  clearStateSpecificCategory,
} from './store';
import { useEffect } from 'react';
import { isEmpty } from 'lodash';
import { useParams } from 'react-router-dom';
import { DoubleSidedImage, Loading } from '@/components/shared';
import { Product } from '@/@types/product';
import CustomerProductCard from '../products/lists/CustomerProductCard';

injectReducer('catalogue', reducer);

type ShowCustomerProductsOfCategoryParams = {
  documentId: string;
};

const CustomerProductsOfCategory = () => {
  const { documentId } =
    useParams<ShowCustomerProductsOfCategoryParams>() as ShowCustomerProductsOfCategoryParams;
  const dispatch = useAppDispatch();
  const { products, productCategory, loading } = useAppSelector(
    (state) => state.catalogue.data
  );

  useEffect(() => {
    if (!productCategory) {
      dispatch(getCatalogueProductCategoryById(documentId));
    } else {
      dispatch(
        getCatalogueProductsByCategory({
          pagination: { page: 1, pageSize: 10 },
          searchTerm: '',
          productCategoryDocumentId: productCategory?.documentId,
        })
      );
    }
  }, [dispatch, productCategory]);

  useEffect(() => {
    return () => {
      dispatch(clearStateSpecificCategory());
    };
  }, []);

  return (
    <Loading loading={loading}>
      <div className="lg:grid lg:grid-cols-3 items-center justify-between mb-4">
        <h3 className="mb-4 lg:mb-0 col-span-1">
          Produits : {productCategory?.name}
        </h3>
      </div>

      {isEmpty(products) && (
        <div className="h-full flex flex-col items-center justify-center">
          <DoubleSidedImage
            src="/img/others/img-2.png"
            darkModeSrc="/img/others/img-2-dark.png"
            alt="Aucun produit trouvé"
          />
          <h3 className="mt-8">Aucun produit trouvé</h3>
        </div>
      )}
      {!isEmpty(products) && (
        <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {products.map((product: Product) => (
            <CustomerProductCard key={product.documentId} product={product} />
          ))}
        </div>
      )}
    </Loading>
  );
};

export default CustomerProductsOfCategory;
