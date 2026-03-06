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

  const shortDesc = product.description
    ? product.description.replace(/<[^>]*>/g, '').trim().slice(0, 100)
    : null;

  return (
    <Card
      key={product.documentId}
      clickable
      onClick={() => handleClick(product.documentId)}
      className="overflow-hidden p-0 hover:shadow-lg transition-shadow duration-200"
    >
      <div className="flex flex-col">
        {/* Image + overlay */}
        <div className="relative" style={{ height: '200px' }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-600">
              <HiPhotograph size={48} />
            </div>
          )}
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 flex flex-col justify-end p-3"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }}
          >
            <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
              {product.name}
            </p>
            <p className="text-white font-bold text-base mt-0.5">
              {getProductBasePrice(product).toFixed(2)} €
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-3 flex flex-col gap-1">
          {shortDesc && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {shortDesc}
            </p>
          )}
          {product.productRef && product.refVisibleToCustomer && (
            <p className="text-xs text-gray-400">Réf. {product.productRef}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default CustomerProductCard;
