import { Product } from '@/@types/product';
import { Card } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

const HomeProductsList = ({ products }: { products: Product[] }) => {
  const navigate = useNavigate();

  return (
    <>
      {products.map((product) => (
        <Card
          key={product.documentId}
          className="col-span-1 card-product cursor-pointer bg-slate-900"
          bodyClass="p-0"
          onClick={() => navigate(`/customer/product/${product.documentId}`)}
        >
          <div className="flex gap-4">
            <img
              src={product.images?.[0]?.url}
              alt={product.name}
              className=" rounded-l-lg bg-yellow-400"
              style={{
                height: '100px',
                width: '100px',
                objectFit: 'cover',
              }}
            />
            <div className="flex flex-col justify-center">
              <p className="text-lg font-bold">{product.name}</p>
              <p className="text-lg font-bold text-white">{product.price}€</p>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
};

export default HomeProductsList;
