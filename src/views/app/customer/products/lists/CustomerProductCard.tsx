import { Card } from '@/components/ui';
import { getProductBasePrice } from '@/utils/productHelpers';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/@types/product';
import { HiPhotograph } from 'react-icons/hi';

const CustomerProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();

  const handleClick = (id: string) => {
    navigate(`/customer/product/${id}`);
  };

  const imageUrl = product.images[0]?.url;

  return (
    <Card
      key={product.documentId}
      clickable
      onClick={() => handleClick(product.documentId)}
    >
      <div className="flex flex-col gap-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="rounded-lg bg-slate-50"
            style={{
              height: '220px',
              width: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            className="rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"
            style={{ height: '220px', width: '100%' }}
          >
            <HiPhotograph size={48} />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-gray-800 leading-tight line-clamp-2">
            {product.name}
          </p>
          {product.productRef && product.refVisibleToCustomer && (
            <p className="text-xs text-gray-400">Réf. {product.productRef}</p>
          )}
          <p className="text-lg font-bold text-indigo-600 mt-1">
            {getProductBasePrice(product).toFixed(2)} €
          </p>
        </div>
      </div>
    </Card>
  );
};

export default CustomerProductCard;
