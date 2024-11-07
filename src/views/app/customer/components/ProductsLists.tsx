import { API_URL_IMAGE } from '@/configs/api.config';
import { IProduct } from '@/@types/product';
import { Card } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

const ProductsLists = ({ products }: { products: IProduct[] }) => {
  const navigate = useNavigate();

  return (
    <>
      {products.map((product) => (
        <Card
          key={product._id}
          className="col-span-1 card-product cursor-pointer bg-slate-900"
          bodyClass="p-0"
          onClick={() => navigate(`/customer/product/${product._id}`)}
        >
          <div className="flex gap-4">
            <img
              src={product.images[0]?.fileNameBack}
              alt={product.title}
              className=" rounded-l-lg bg-yellow-400"
              style={{
                height: '100px',
                width: '100px',
                objectFit: 'cover',
              }}
            />
            <div className="flex flex-col justify-center">
              <p className="text-lg font-bold">{product.title}</p>
              <p className="text-lg font-bold text-white">{product.amount}€</p>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
};

export default ProductsLists;
