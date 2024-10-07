import { injectReducer } from '@/store'
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import reducer, {
  clearState,
  setFormDialog,
  useAppDispatch,
  useAppSelector,
  getProductById
} from "./store";
import { API_URL_IMAGE } from '@/configs/api.config';
import { addToCart } from '@/store/slices/base/cartSlice';
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import Input from "@/components/ui/Input";

import { Button, Notification, toast } from '@/components/ui';
import { IProduct, SizeSelection } from '@/@types/product';
import { CartItem } from '@/@types/cart';
import ModalCompleteForm from './modal/ModalCompleteForm';
import { Field } from 'formik';

injectReducer("showProduct", reducer);

type ShowProductParams = {
  id: string;
};

const ShowProduct = () => {
  const {id} = useParams<ShowProductParams>() as ShowProductParams
  const dispatch = useAppDispatch()
  const { product, formCompleted, formAnswer } = useAppSelector((state) => state.showProduct.data)
  const [canAddToCart, setCanAddToCart] = useState<boolean>(false);
  const [sizesSelected, setSizesSelected] = useState<SizeSelection[]>([]);

  useEffect(() => {
    dispatch(getProductById(id))
 }, [dispatch])

  useEffect(() => {
    return () => {
      dispatch(clearState())
    }
  }, [])

  useEffect(() => {
    setCanAddToCart(Boolean(sizesSelected.length > 0 && (!product?.form || formCompleted)))
  }, [sizesSelected, formCompleted])

  const handleAddToCart = (product: IProduct | null) => {
    dispatch(addToCart({product, formAnswer, quantity: 1} as CartItem));
    toast.push(
      <Notification type="success" title="Ajouté">
        Article ajouté au panier
      </Notification>
    )
  }

  const handleCompleteForm = () => {
    dispatch(setFormDialog(true));
  }

  return (
    <Container className="h-full">
      <Loading>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-1/2 w-full">
              <img
                src={API_URL_IMAGE + product?.images[0]}
                alt={product?.title}
                className="w-full h-auto rounded-lg shadow-md object-cover"
              />
            </div>

            <div className="lg:w-1/2 w-full lg:pl-12 mt-6 lg:mt-0">
              <div className="flex flex-col justify-between">
                <h1 className="text-3xl font-bold">{product?.title}</h1>
                <p className="text-2xl font-semibold">{product?.amount.toFixed(2)} €</p>
              </div>

              <p className="mt-4 leading-relaxed">{product?.description.replace('<p>', '').replace('</p>', '')}</p>

              {product?.sizes.status && (
                <div>
                  <p className="font-bold text-yellow-500 mb-4">Choix des tailles</p>
                  <div className="grid grid-cols-7 gap-4 mb-6">
                    {product.sizes.options.map((option) => (
                      <div key={option.value} className="grid gap-4">
                        <span>{option.label}</span>
                        <Input
                          name={option.value}
                          type="number"
                          autoComplete="off"
                          onChange={(e : any) => {
                            if (e.target.value > 0) {
                              const index = sizesSelected.findIndex(
                                (sizeSelected) => sizeSelected.value === option.value
                              );
                              // Trouver l'index de l'option actuelle dans le tableau sizeField
                              const newSizeSelected = {
                                label: option.label,
                                value: option.value,
                                amount: parseInt(e.target.value),
                              };
                              // Si l'option existe déjà, la mettre à jour, sinon l'ajouter
                              if (index > -1) {
                                const newSizesSelected = [...sizesSelected];
                                newSizesSelected[index] = newSizeSelected;
                                setSizesSelected(newSizesSelected);
                              } else {
                                setSizesSelected([...sizesSelected, newSizeSelected]);
                              }
                            } else {
                              setSizesSelected([...sizesSelected.filter(((sizeSelected) => sizeSelected.value !== option.value))])
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {sizesSelected.length === 0 && (<p className="mt-4 text-green-600">Veuillez renseigner au moins une taille</p>)}
                </div>
              )}

              {product?.form && (
                <Button
                  className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  onClick={() => handleCompleteForm()}
                >
                  {formCompleted ? 'Modifier les détails' : 'Veuillez renseigner les détails du produit'}
                </Button>
              )}

              <Button
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                disabled={!canAddToCart}
                onClick={() => handleAddToCart(product)}
              >
                Ajouter au panier
              </Button>
            </div>
          </div>
        </div>
      </Loading>
      {product?.form && <ModalCompleteForm form={product.form} />}
    </Container>
  );
}

export default ShowProduct
