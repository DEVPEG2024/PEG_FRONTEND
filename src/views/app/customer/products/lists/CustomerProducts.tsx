import { injectReducer } from '@/store';
import reducer, {
  getCustomerProducts,
  useAppDispatch,
  useAppSelector,
  setProduct,
} from '../store';
import { useEffect } from 'react';
import { isEmpty } from 'lodash';
import { DoubleSidedImage, Loading } from '@/components/shared';
import CustomerProductCard from './CustomerProductCard';
import { User } from '@/@types/user';

injectReducer('products', reducer);

const CustomerProducts = () => {
  const { user }: { user?: User } = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { products, loading } = useAppSelector((state) => state.products.data);
  useEffect(() => {
    dispatch(
      getCustomerProducts({
        page: 1,
        pageSize: 10,
        searchTerm: '',
        customerDocumentId: user.customer!.documentId || '',
        customerCategoryDocumentId:
          user.customer!.customerCategory?.documentId || '',
      })
    );
    dispatch(setProduct(null));
  }, [dispatch]);

  return (
    <>
      <div className="lg:grid lg:grid-cols-3 items-center justify-between mb-4">
        <h3 className="mb-4 lg:mb-0 col-span-1">Mes offres personnalisées</h3>
      </div>
      <Loading loading={loading}>
        {isEmpty(products) && (
          <div className="h-full flex flex-col items-center justify-center">
            <DoubleSidedImage
              src="/img/others/img-2.png"
              darkModeSrc="/img/others/img-2-dark.png"
              alt="Aucune offre personnalisée trouvée"
            />
            <h3 className="mt-8">Aucune offre personnalisée trouvée</h3>
          </div>
        )}
        {!isEmpty(products) && (
          <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <CustomerProductCard key={product.documentId} product={product} />
            ))}
          </div>
        )}
      </Loading>
    </>
  );
};

export default CustomerProducts;
