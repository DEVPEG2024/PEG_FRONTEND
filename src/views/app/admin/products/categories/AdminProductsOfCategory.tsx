import { injectReducer, useAppDispatch } from '@/store';
import { useEffect } from 'react';
import { Card } from '@/components/ui';
import { isEmpty } from 'lodash';
import { useParams } from 'react-router-dom';
import { DoubleSidedImage, Loading } from '@/components/shared';
import reducer, {
  getProductCategoryById,
  getProductsByCategory,
  useAppSelector,
} from './store';

injectReducer('productCategories', reducer);

type ShowAdminProductsOfCategoryParams = {
  documentId: string;
};

const AdminProductsOfCategory = () => {
  const { documentId }: { documentId: string } =
    useParams<ShowAdminProductsOfCategoryParams>() as ShowAdminProductsOfCategoryParams;
  const dispatch = useAppDispatch();
  const { products, productCategory, loading } = useAppSelector(
    (state) => state.productCategories.data
  );

  useEffect(() => {
    if (!productCategory) {
      dispatch(getProductCategoryById(documentId));
    } else {
      dispatch(
        getProductsByCategory({
          pagination: { page: 1, pageSize: 1000 },
          searchTerm: '',
          productCategoryDocumentId: productCategory?.documentId,
        })
      );
    }
  }, [dispatch, productCategory]);

  return (
    <>
      <div className="lg:grid lg:grid-cols-3 items-center justify-between mb-4">
        <h3 className="mb-4 lg:mb-0 col-span-1">{`Produits de la catégorie ${productCategory?.name}`}</h3>
      </div>

      <Loading loading={loading}>
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
            {products.map((product) => (
              <Card key={product.documentId}>
                <div className="flex flex-col gap-4">
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className=" rounded-lg bg-slate-50"
                    style={{
                      height: '250px',
                      width: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <div className="flex flex-col justify-between">
                    <p className="text-lg font-bold">{product.name}</p>
                    <p className="text-lg font-bold text-white">
                      {product.price.toFixed(2)}€
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Loading>
    </>
  );
};

export default AdminProductsOfCategory;
