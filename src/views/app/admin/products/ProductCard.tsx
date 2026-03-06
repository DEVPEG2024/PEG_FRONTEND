import { useNavigate } from 'react-router-dom';
import { Button, Card, Switcher, Tooltip, Tag } from '@/components/ui';
import { HiDuplicate, HiPencil, HiPhotograph, HiTrash } from 'react-icons/hi';
import { Product } from '@/@types/product';
import { getProductBasePrice } from '@/utils/productHelpers';
import { memo } from 'react';

const ProductCard = memo(
  ({
    product,
    onDeleteModalOpen,
    onActivate,
    onDuplicate,
  }: {
    product: Product;
    onDeleteModalOpen: (product: Product) => void;
    onActivate: (product: Product, checked: boolean) => void;
    onDuplicate: (product: Product) => void;
  }) => {
    const navigate = useNavigate();
    const onEdit = (product: Product) => {
      navigate(`/admin/products/edit/${product.documentId}`);
    };

    const imageUrl = product.images[0]?.url;

    const shortDesc = product.description
      ? product.description.replace(/<[^>]*>/g, '').trim().slice(0, 100)
      : null;

    return (
      <Card key={product.documentId} className="overflow-hidden p-0">
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
            {/* Badges */}
            {!product.active && (
              <div className="absolute top-2 left-2">
                <Tag className="bg-red-500 text-white border-0 text-xs font-medium">
                  Inactif
                </Tag>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-3 flex flex-col gap-2">
            {shortDesc && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {shortDesc}
              </p>
            )}
            {product.productRef && (
              <p className="text-xs text-gray-400">Réf. {product.productRef}</p>
            )}
            <div className="flex gap-1.5 items-center flex-wrap pt-1">
              <Button
                variant="twoTone"
                size="sm"
                onClick={() => onEdit(product)}
                icon={<HiPencil />}
              >
                Modifier
              </Button>
              <Tooltip title="Activer/Désactiver le produit">
                <Switcher
                  checked={product.active}
                  onChange={(checked) => onActivate(product, checked)}
                />
              </Tooltip>
              <Tooltip title="Dupliquer le produit">
                <Button
                  variant="plain"
                  onClick={() => onDuplicate(product)}
                  size="sm"
                  icon={<HiDuplicate />}
                />
              </Tooltip>
              <Tooltip title="Supprimer le produit">
                <Button
                  variant="plain"
                  onClick={() => onDeleteModalOpen(product)}
                  size="sm"
                  icon={<HiTrash />}
                />
              </Tooltip>
            </div>
          </div>
        </div>
      </Card>
    );
  }
);

export default ProductCard;
