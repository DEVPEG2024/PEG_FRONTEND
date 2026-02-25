import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Switcher,
  Tooltip,
} from '@/components/ui';
import { HiDuplicate, HiPencil, HiTrash } from 'react-icons/hi';
import { Product } from '@/@types/product';
import { memo } from 'react';

const ProductCard = memo(({product, onDeleteModalOpen, onActivate, onDuplicate}: {product: Product, onDeleteModalOpen: (product: Product) => void, onActivate: (product: Product, checked: boolean) => void, onDuplicate: (product: Product) => void}) => {
  const navigate = useNavigate();
  const onEdit = (product: Product) => {
    navigate(`/admin/products/edit/${product.documentId}`);
  };

  return (
    <Card key={product.documentId}>
      <div className="flex flex-col gap-4">
        <img
          src={product.images[0]?.url}
          alt={product.name}
          className="rounded-lg bg-slate-50"
          style={{
            height: '250px',
            width: '100%',
            objectFit: 'cover',
          }}
        />
        <div className="flex flex-col justify-between">
        <p className="text-lg font-bold">{product.name}</p>
        <p className="text-lg font-bold text-white">
            {product.price.toFixed(2)}€
        </p>
        <div className="flex gap-4 items-center ">
            <Button
            className="mt-4 "
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
                className="mt-4"
            />
            </Tooltip>
            <Tooltip title="Dupliquer le produit">
            <Button
                className="mt-4 "
                variant="plain"
                onClick={() => onDuplicate(product)}
                size="sm"
                icon={<HiDuplicate />}
            />
            </Tooltip>
            <Tooltip title="Supprimer le produit">
            <Button
                className="mt-4 "
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
});

export default ProductCard;
