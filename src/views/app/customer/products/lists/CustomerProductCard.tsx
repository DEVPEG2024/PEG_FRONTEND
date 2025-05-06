import { Card } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/@types/product';

const CustomerProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();

  const handleClick = (id: string) => {
    navigate(`/customer/product/${id}`);
  };

  return (
    <Card
      key={product.documentId}
      clickable
      onClick={() => handleClick(product.documentId)}
    >
      <div className="flex flex-col gap-4">
        <img
          src={product.images[0]?.url}
          alt={product.name}
          className=" rounded-lg bg-slate-50"
          style={{
            height: '250px',
            width: '100%',
            objectFit: 'cover',
          }}
        />
        <div className="flex flex-col justify-between">
          <p className="text-lg font-bold">{product.name}</p>
          <p className="text-lg font-bold text-white">{product.price.toFixed(2)}€</p>
        </div>
      </div>
    </Card>
  );
};

export default CustomerProductCard;
