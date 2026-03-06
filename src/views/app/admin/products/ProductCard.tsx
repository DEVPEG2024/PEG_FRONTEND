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

    return (
      <Card key={product.documentId}>
        <div className="flex flex-col gap-3">
          <div className="relative">
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
            {!product.active && (
              <div className="absolute top-2 left-2">
                <Tag className="bg-red-100 text-red-600 border-0 text-xs">
                  Inactif
                </Tag>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-gray-800 leading-tight line-clamp-2">
              {product.name}
            </p>
            {product.productRef && (
              <p className="text-xs text-gray-400">Réf. {product.productRef}</p>
            )}
            <p className="text-lg font-bold text-indigo-600 mt-1">
              {getProductBasePrice(product).toFixed(2)} €
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
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
      </Card>
    );
  }
);

export default ProductCard;
