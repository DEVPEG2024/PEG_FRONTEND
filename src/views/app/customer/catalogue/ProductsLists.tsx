import { injectReducer } from '@/store';
import reducer, {
  useAppDispatch,
  useAppSelector,
  setProduct,
  getProductsByCategory,
} from './store';
import { Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
} from '@/components/ui';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { isEmpty } from 'lodash';
import { useParams } from 'react-router-dom';
import { DoubleSidedImage } from '@/components/shared';
injectReducer('products', reducer);

const ProductsLists = () => {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { products } = useAppSelector(
    (state) => state.products.data
  );
  useEffect(() => {
    dispatch(getProductsByCategory(id as string));
    dispatch(setProduct(null));
  }, [dispatch]);

  const onEdit = (id: string) => {
    dispatch(setProduct(id));
    navigate(`/admin/store/edit/${id}`);
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="lg:grid lg:grid-cols-3 items-center justify-between mb-4">
        <h3 className="mb-4 lg:mb-0 col-span-1">Produits</h3>
      </div>

      {isEmpty(products) && (
        <div className="h-full flex flex-col items-center justify-center">
          <DoubleSidedImage
            src="/img/others/img-2.png"
            darkModeSrc="/img/others/img-2-dark.png"
            alt="Aucun licencié trouvé"
          />
          <h3 className="mt-8">Aucun produit trouvé</h3>
        </div>
      )}
      {!isEmpty(products) && (
        <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <Card key={product._id}>
              <div className="flex flex-col gap-4">
                <img
                  src={product.images[0]?.fileNameBack}
                  alt={product.title}
                  className=" rounded-lg bg-yellow-400"
                  style={{
                    height: '250px',
                    width: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div className="flex flex-col justify-between">
                  <p className="text-lg font-bold">{product.title}</p>
                  <p className="text-lg font-bold text-white">
                    {product.amount}€
                  </p>
                  {product.stock > 0 ? (
                    <p className="text-sm text-emerald-500">En stock</p>
                  ) : (
                    <p className="text-sm text-red-500">Rupture de stock</p>
                  )}
                  <div className="flex gap-4 items-center ">
                    <Button
                      className="mt-4 "
                      variant="twoTone"
                      size="sm"
                      onClick={() => onEdit(product._id)}
                      icon={<HiPencil />}
                    >
                      Modifier
                    </Button>
                    <Button
                      className="mt-4 "
                      variant="plain"
                      onClick={() => onModalOpen(product._id)}
                      size="sm"
                      icon={<HiTrash />}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Suspense>
  );
};

export default ProductsLists;
