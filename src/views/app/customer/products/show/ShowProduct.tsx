import { injectReducer } from '@/store';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import reducer, {
  clearState,
  setFormDialog,
  useAppDispatch,
  useAppSelector,
  getProductById,
  setSizesSelected,
} from './store';
import {
  addToCart,
  CartItemSizeEdition,
  editSizesCartItem,
} from '@/store/slices/base/cartSlice';
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import Input from '@/components/ui/Input';

import { Button, Notification, toast } from '@/components/ui';
import { OptionsFields, SizeSelection } from '@/@types/product';
import { CartItem } from '@/@types/cart';
import ModalCompleteForm from '../modal/ModalCompleteForm';
injectReducer('showProduct', reducer);

type ShowProductParams = {
  id: string;
};

const ShowProduct = () => {
  const { id } = useParams<ShowProductParams>() as ShowProductParams;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const onEdition: boolean = useLocation().pathname.split('/').pop() === 'edit';
  const { product, formCompleted, formAnswer, sizesSelected, cartItemId } =
    useAppSelector((state) => state.showProduct.data);
  const [canAddToCart, setCanAddToCart] = useState<boolean>(false);
  const [isFirstRender, setFirstRender] = useState<boolean>(true);
  const [sizesChanged, setSizesChanged] = useState<boolean>(false);

  useEffect(() => {
    if (!product) {
      if (onEdition) {
        navigate('/customer/cart');
      } else {
        dispatch(getProductById(id));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (isFirstRender) {
      setFirstRender(false);
    }
    return () => {
      if (!isFirstRender) {
        dispatch(clearState());
      }
    };
  }, [isFirstRender]);

  useEffect(() => {
    setCanAddToCart(
      ((product?.sizes?.status && sizesSelected.length > 0) ||
        !product?.sizes?.status) &&
        ((product?.form && formCompleted) || !product?.form)
    );
  }, [sizesSelected, formCompleted, product]);

  const handleAddToCart = () => {
    dispatch(
      addToCart({ product, formAnswer, sizes: sizesSelected } as CartItem)
    );
    toast.push(
      <Notification type="success" title="Ajouté">
        Article ajouté au panier
      </Notification>
    );
    navigate('/customer/products');
  };

  const handleCompleteForm = () => {
    dispatch(setFormDialog(true));
  };

  const handleSizesChanged = (value: number, option: OptionsFields) => {
    const newSizesSelected = determineNewSizes(value, option);

    setSizesChanged(true);
    dispatch(setSizesSelected(newSizesSelected));
  };

  const handleEditSizesCartItem = () => {
    dispatch(
      editSizesCartItem({
        cartItemId,
        sizes: sizesSelected,
      } as CartItemSizeEdition)
    );
    toast.push(
      <Notification type="success" title="Modifié">
        Tailles modifiées
      </Notification>
    );
    navigate('/customer/cart');
  };

  const determineNewSizes = (value: number, option: OptionsFields) => {
    if (value > 0) {
      const index = sizesSelected.findIndex(
        (sizeSelected) => sizeSelected.value === option.value
      );
      // Trouver l'index de l'option actuelle dans le tableau sizeField
      const newSizeSelected: SizeSelection = {
        value: option.value,
        quantity: value,
      };
      // Si l'option existe déjà, la mettre à jour, sinon l'ajouter
      if (index > -1) {
        const newSizesSelected = [...sizesSelected];
        newSizesSelected[index] = newSizeSelected;
        return newSizesSelected;
      } else {
        return [...sizesSelected, newSizeSelected];
      }
    } else {
      return [
        ...sizesSelected.filter(
          (sizeSelected) => sizeSelected.value !== option.value
        ),
      ];
    }
  };

  return (
    product && (
      <Container className="h-full">
        <Loading>
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="lg:w-1/2 w-full">
                <img
                  src={product.images[0]?.fileNameBack}
                  alt={product.title}
                  className="w-full h-auto rounded-lg shadow-md object-cover"
                />
              </div>

              <div className="lg:w-1/2 w-full lg:pl-12 mt-6 lg:mt-0">
                <div className="flex flex-col justify-between">
                  <h1 className="text-3xl font-bold">{product.title}</h1>
                  <p className="text-2xl font-semibold">
                    {product.amount.toFixed(2)} €
                  </p>
                </div>

                <p className="mt-4 leading-relaxed">
                  {product.description.replace('<p>', '').replace('</p>', '')}
                </p>

                {product.sizes.status ? (
                  <div>
                    <p className="font-bold text-yellow-500 mb-4">
                      Choix des tailles
                    </p>
                    <div className="grid grid-cols-7 gap-4 mb-6">
                      {product.sizes.options.map((option) => (
                        <div key={option.value} className="grid gap-4">
                          <span>{option.label}</span>
                          <Input
                            name={option.value}
                            value={
                              sizesSelected.find(
                                (sizeSelected) =>
                                  sizeSelected.value === option.value
                              )?.quantity
                            }
                            type="number"
                            autoComplete="off"
                            onChange={(e: any) =>
                              handleSizesChanged(
                                parseInt(e.target.value),
                                option
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                    {sizesSelected.length === 0 && (
                      <p className="mt-4 text-green-600">
                        Veuillez renseigner au moins une taille
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex-auto mt-8 flex-initial w-32">
                    <span>Quantité</span>
                    <Input
                      name="Quantité"
                      value={
                        sizesSelected.find(
                          (sizeSelected) => sizeSelected.value === 'DEFAULT'
                        )?.quantity
                      }
                      type="number"
                      autoComplete="off"
                      onChange={(e: any) =>
                        handleSizesChanged(parseInt(e.target.value), {
                          label: 'Default',
                          value: 'DEFAULT',
                          stock: 0,
                        })
                      }
                    />
                  </div>
                )}

                {onEdition && (
                  <Button
                    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    disabled={!sizesChanged}
                    onClick={handleEditSizesCartItem}
                  >
                    Enregistrer les tailles
                  </Button>
                )}

                {product.form && (
                  <Button
                    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    onClick={() => handleCompleteForm()}
                  >
                    {formCompleted
                      ? 'Modifier les détails'
                      : 'Veuillez renseigner les détails du produit'}
                  </Button>
                )}

                {!onEdition && (
                  <Button
                    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    disabled={!canAddToCart}
                    onClick={handleAddToCart}
                  >
                    Ajouter au panier
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Loading>
        {product.form && (
          <ModalCompleteForm form={product.form} onEdition={onEdition} />
        )}
      </Container>
    )
  );
};

export default ShowProduct;
