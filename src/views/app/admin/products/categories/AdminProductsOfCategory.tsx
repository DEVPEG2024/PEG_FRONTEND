import { injectReducer, useAppDispatch } from '@/store';
import { getProductBasePrice } from '@/utils/productHelpers';
import { fmtPrice } from '@/utils/priceHelpers';
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

  // Tout est piloté par le documentId de l'URL — jamais par l'état persistant.
  // (L'ancien code ne rechargeait la catégorie que si le store était vide :
  // la PREMIÈRE catégorie visitée restait affichée pour toutes les autres.)
  useEffect(() => {
    dispatch(getProductCategoryById(documentId));
    dispatch(
      getProductsByCategory({
        pagination: { page: 1, pageSize: 1000 },
        searchTerm: '',
        productCategoryDocumentId: documentId,
      })
    );
  }, [dispatch, documentId]);

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
                    src={product.images?.[0]?.url ?? '/img/others/img-2.png'}
                    alt={product.name}
                    className="rounded-lg"
                    style={{
                      height: '220px',
                      width: '100%',
                      // `contain` + padding : l'image entière tient dans le cadre
                      // (jamais rognée ni débordante), cohérent avec la carte
                      // produit admin. `cover` agrandissait/coupait les visuels.
                      objectFit: 'contain',
                      padding: '12px',
                      boxSizing: 'border-box',
                      background: '#fff',
                      display: 'block',
                    }}
                  />
                  <div className="flex flex-col justify-between">
                    <p className="text-lg font-bold">{product.name}</p>
                    <p className="text-lg font-bold text-white">
                      {fmtPrice(getProductBasePrice(product))}
                    </p>
                    {(!product.active || !product.inCatalogue) && (
                      <p style={{ margin: '4px 0 0', color: '#f87171', fontSize: '11px', fontWeight: 700 }}>
                        ⚠ Invisible côté client ({[!product.active && 'inactif', !product.inCatalogue && 'hors catalogue'].filter(Boolean).join(' · ')})
                      </p>
                    )}
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
