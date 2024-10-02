
import { API_URL_IMAGE } from '@/configs/api.config';
import { IProduct } from '@/@types/product'
import { BsCart2 } from 'react-icons/bs';
import { useAppDispatch } from '@/store';
import { CartItem } from '@/@types/cart';
import { addToCart } from '@/store/slices/base/cartSlice';
import { Button, Card, Notification, toast } from "@/components/ui";

const ProductsLists = ({products}: {products: IProduct[]}) => {
  const dispatch = useAppDispatch();
  const onOrder = async (product: IProduct) => {
    dispatch(addToCart(product as CartItem));
    toast.push(<Notification type="success" title="Produit ajouté au panier" />)
  }
    return (
      <>
        {products.map((product) => (
          <Card
            key={product._id}
            className="col-span-1 card-product cursor-pointer bg-slate-900"
            bodyClass="p-0"
          >
            <div className="flex gap-4">
              <img
                src={API_URL_IMAGE + product.images[0]}
                alt={product.title}
                className=" rounded-l-lg bg-yellow-400"
                style={{
                  height: "100px",
                  width: "100px",
                  objectFit: "cover",
                }}
              />
              <div className="flex flex-col justify-center">
                <p className="text-lg font-bold">{product.title}</p>
                <p className="text-lg font-bold text-white">
                  {product.amount}€
                </p>
                <Button
                  variant="twoTone"
                  size="xs"
                  className="flex items-center justify-center gap-2 mt-1"
                  onClick={() => onOrder(product)}
                >
                  <span>Commander</span>
                  <BsCart2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </>
    );
}

export default ProductsLists
