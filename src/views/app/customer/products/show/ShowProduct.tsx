import { injectReducer } from '@/store';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import reducer, {
  clearState,
  setFormDialog,
  useAppDispatch,
  useAppSelector,
  getProductToShow,
  setSizeAndColorsSelected,
} from './store';
import {
  addToCart,
  CartItemSizeAndColorEdition,
  editSizeAndColorsCartItem,
} from '@/store/slices/base/cartSlice';
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import Input from '@/components/ui/Input';

import { Button, Notification, toast } from '@/components/ui';
import { Color, Size, SizeAndColorSelection } from '@/@types/product';
import { CartItem } from '@/@types/cart';
import ModalCompleteForm from '../modal/ModalCompleteForm';
import SizeAndColorsChoice from './SizeAndColorsChoice';

injectReducer('showProduct', reducer);

type ShowProductParams = {
  documentId: string;
};

const ShowProduct = () => {
  const { documentId } = useParams<ShowProductParams>() as ShowProductParams;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const onEdition: boolean = useLocation().pathname.split('/').pop() === 'edit';
  const { product, formCompleted, formAnswer, sizeAndColorsSelected, cartItemId } =
    useAppSelector((state) => state.showProduct.data);
  const [canAddToCart, setCanAddToCart] = useState<boolean>(false);
  const [isFirstRender, setFirstRender] = useState<boolean>(true);
  const [sizeAndColorsChanged, setSizeAndColorsChanged] = useState<boolean>(false);

  useEffect(() => {
    if (!product) {
      if (onEdition) {
        navigate('/customer/cart');
      } else {
        dispatch(getProductToShow(documentId));
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
      product &&
        ((product.sizes.length > 0 && sizeAndColorsSelected.length > 0) ||
          product.sizes.length === 0) &&
        ((product.form && formCompleted) || !product.form)
    );
  }, [sizeAndColorsSelected, formCompleted, product]);

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        id: Math.random().toString(16).slice(2),
        product,
        formAnswer,
        sizeAndColors: sizeAndColorsSelected,
      } as CartItem)
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

  const handleSizeAndColorsChanged = (value: number, size: Size, color: Color): void => {
    const newSizeAndColorsSelected = determineNewSizeAndColors(value, size, color);

    setSizeAndColorsChanged(true);
    dispatch(setSizeAndColorsSelected(newSizeAndColorsSelected));
  };

  const handleEditSizeAndColorsCartItem = () => {
    dispatch(
      editSizeAndColorsCartItem({
        cartItemId,
        sizeAndColors: sizeAndColorsSelected,
      } as CartItemSizeAndColorEdition)
    );
    toast.push(
      <Notification type="success" title="Modifié">
        Tailles modifiées
      </Notification>
    );
    navigate('/customer/cart');
  };

  const determineNewSizeAndColors = (value: number, size: Size, color: Color) => {
    if (value > 0) {
      const index = sizeAndColorsSelected.findIndex(
        (sizeAndColorSelected) => sizeAndColorSelected.size.value === size.value && sizeAndColorSelected.color.value === color.value
      );
      // Trouver l'index de l'option actuelle dans le tableau sizeField
      const newSizeAndColorSelected: SizeAndColorSelection = {
        size,
        color,
        quantity: value,
      };
      // Si l'option existe déjà, la mettre à jour, sinon l'ajouter
      if (index > -1) {
        const newSizeAndColorsSelected = [...sizeAndColorsSelected];
        newSizeAndColorsSelected[index] = newSizeAndColorSelected;
        return newSizeAndColorsSelected;
      } else {
        return [...sizeAndColorsSelected, newSizeAndColorSelected];
      }
    } else {
      return [
        ...sizeAndColorsSelected.filter(
          (sizeAndColorSelected) => !(sizeAndColorSelected.size.value === size.value && sizeAndColorSelected.color.value === color.value)
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
                  src={product.images[0]?.url}
                  alt={product.name}
                  className="w-full h-auto rounded-lg shadow-md object-cover bg-slate-50"
                />
              </div>

              <div className="lg:w-1/2 w-full lg:pl-12 mt-6 lg:mt-0">
                <div className="flex flex-col justify-between">
                  <h1 className="text-3xl font-bold">{product.name}</h1>
                  <p className="text-2xl font-semibold">
                    {product.price.toFixed(2)} €
                  </p>
                </div>

                <p className="mt-4 leading-relaxed">
                  {product.description?.replace('<p>', '').replace('</p>', '')}
                </p>

                <SizeAndColorsChoice
                  product={product}
                  sizeAndColorsSelected={sizeAndColorsSelected}
                  handleSizeAndColorsChanged={handleSizeAndColorsChanged}
                />

                {onEdition && (
                  <Button
                    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    disabled={!sizeAndColorsChanged}
                    onClick={handleEditSizeAndColorsCartItem}
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
