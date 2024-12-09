import { injectReducer } from '@/store';
import reducer, {
  useAppDispatch,
  useAppSelector,
  setProduct,
  getProductsByCategory,
} from '../store';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui';
import { isEmpty } from 'lodash';
import { useParams } from 'react-router-dom';
import { DoubleSidedImage } from '@/components/shared';
injectReducer('products', reducer);

const ProductsLists = () => {
  const { documentId } : {documentId: string} = useParams();
  const dispatch = useAppDispatch();
  const [productId, setProductId] = useState('');
  const { products } = useAppSelector(
    (state) => state.products.data
  );
  useEffect(() => {
    dispatch(getProductsByCategory(documentId));
    dispatch(setProduct(null));
  }, [dispatch]);
  return (
    <>
      <div className="lg:grid lg:grid-cols-3 items-center justify-between mb-4">
        <h3 className="mb-4 lg:mb-0 col-span-1">Produits</h3>
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
          {products.map((product) => (
            <Card key={product.documentId}>
              <div className="flex flex-col gap-4">
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className=" rounded-lg bg-yellow-400"
                  style={{
                    height: '250px',
                    width: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div className="flex flex-col justify-between">
                  <p className="text-lg font-bold">{product.name}</p>
                  <p className="text-lg font-bold text-white">
                    {product.price}€
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default ProductsLists;
