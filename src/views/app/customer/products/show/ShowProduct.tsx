import { injectReducer } from '@/store'
import { useState } from "react";
import reducer, {
  useAppDispatch,
  useAppSelector,
} from "../store";
import { API_URL_IMAGE } from '@/configs/api.config';
import { useNavigate } from 'react-router-dom'
import { addToCart } from '@/store/slices/base/cartSlice';
import AdaptableCard from '@/components/shared/AdaptableCard'
import Loading from '@/components/shared/Loading'
import Container from '@/components/shared/Container'
import IconText from '@/components/shared/IconText'
import {
    HiClock,
    HiCalendar,
    HiCheckCircle,
    HiExclamationCircle,
} from 'react-icons/hi'
import ReactHtmlParser from 'html-react-parser'
import { Button, Notification, toast } from '@/components/ui';
import { IProduct } from '@/@types/product';
import { CartItem } from '@/@types/cart';

injectReducer("products", reducer);

const ShowProduct = () => {
  const user = useAppSelector(state => state.auth.user)
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const {product} = useAppSelector((state) => state.products.data)
    const [selectedSize, setSelectedSize] = useState<string>('');

    const handleSizeChange = (size: string) => {
      setSelectedSize(size);
    };

    const handleAddToCart = (product: IProduct | null) => {
      dispatch(addToCart(product as CartItem));
      toast.push(
        <Notification type="success" title="Ajouté">
          Ajouté au panier : ${product?.title} - Taille ${selectedSize}
        </Notification>
    )
    }
    return (
      <Container className="h-full">
        <Loading>
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row items-center justify-between">
              {/* Section Image */}
              <div className="lg:w-1/2 w-full">
                <img
                  src={API_URL_IMAGE + product?.images[0]}
                  alt={product?.title}
                  className="w-full h-auto rounded-lg shadow-md object-cover"
                />
              </div>

              {/* Section Infos produit */}
              <div className="lg:w-1/2 w-full lg:pl-12 mt-6 lg:mt-0">
                {/* Titre et prix */}
                <div className="flex flex-col justify-between">
                  <h1 className="text-3xl font-bold">{product?.title}</h1>
                  <p className="text-2xl font-semibold">{product?.amount.toFixed(2)} €</p>
                </div>
                
                <p className="mt-4 leading-relaxed">{product?.description.replace('<p>', '').replace('</p>', '')}</p>

                {/* Sélection des tailles */}
                <div className="mt-6">
                  <h3 className="text-xl font-medium text-gray-200">Choisissez une taille :</h3>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {product?.sizes.options.map(({value, label}) => (
                      <button
                        key={value}
                        onClick={() => handleSizeChange(value)}
                        className={`px-4 py-2 border rounded-lg transition-colors duration-200
                          ${
                            selectedSize === value
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-green-600">{selectedSize ? "Taille sélectionnée : " + selectedSize : "Veuillez sélectionner une taille"}</p>
                </div>

                {/* Bouton d'ajout au panier */}
                <Button
                    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    disabled={!selectedSize}
                    onClick={() => handleAddToCart(product)}
                  >
                    Ajouter au panier
                  </Button>
              </div>
            </div>
          </div>
        </Loading>
      </Container>
    );
}

export default ShowProduct
