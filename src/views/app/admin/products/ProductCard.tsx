import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { HiDuplicate, HiPencil, HiPhotograph, HiTrash } from 'react-icons/hi';
import { Product } from '@/@types/product';
import { getProductBasePrice } from '@/utils/productHelpers';
import { memo } from 'react';

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #16263d 0%, #0f1c2e 100%)',
  borderRadius: '16px',
  padding: '28px',
  fontFamily: 'Inter, sans-serif',
  display: 'flex',
  flexDirection: 'column',
};

const badgeStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #2f6fed 0%, #1f4bb6 100%)',
  borderRadius: '24px',
  padding: '7px 24px',
  color: '#fff',
  fontWeight: 700,
  fontSize: '18px',
  display: 'inline-block',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '7px',
  color: 'rgba(255,255,255,0.7)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
};

const editBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #2f6fed 0%, #1f4bb6 100%)',
  borderRadius: '10px',
  padding: '9px 18px',
  color: '#fff',
  fontWeight: 600,
  fontSize: '13px',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const switchStyle = (active: boolean): React.CSSProperties => ({
  width: '36px',
  height: '20px',
  borderRadius: '10px',
  background: active ? '#2f6fed' : 'rgba(255,255,255,0.15)',
  position: 'relative',
  cursor: 'pointer',
  transition: 'background 0.2s',
  flexShrink: 0,
});

const switchDotStyle = (active: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: '3px',
  left: active ? '19px' : '3px',
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  background: '#fff',
  transition: 'left 0.2s',
});

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
    const imageUrl = product.images[0]?.url;

    return (
      <div style={cardStyle}>
        {/* Titre + badge inactif */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <h3 className="text-white font-semibold leading-snug line-clamp-2 flex-1" style={{ fontSize: '15px' }}>
            {product.name}
          </h3>
          {!product.active && (
            <span
              style={{
                background: 'rgba(239,68,68,0.2)',
                border: '1px solid rgba(239,68,68,0.5)',
                borderRadius: '6px',
                padding: '2px 8px',
                color: '#f87171',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              Inactif
            </span>
          )}
        </div>

        {/* Séparateur */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />

        {/* Image */}
        <div className="flex justify-center mb-5">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              style={{ height: '150px', width: '100%', objectFit: 'contain', borderRadius: '10px' }}
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{ height: '150px', width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}
            >
              <HiPhotograph size={40} />
            </div>
          )}
        </div>

        {/* Badge prix */}
        <div className="flex justify-center mb-4">
          <span style={badgeStyle}>
            {getProductBasePrice(product).toFixed(2)} €
          </span>
        </div>

        {product.productRef && (
          <p className="text-center mb-4" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
            Réf. {product.productRef}
          </p>
        )}

        {/* Séparateur */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button style={editBtnStyle} onClick={() => navigate(`/admin/products/edit/${product.documentId}`)}>
            <HiPencil size={14} />
            Modifier
          </button>

          <Tooltip title={product.active ? 'Désactiver' : 'Activer'}>
            <div
              style={switchStyle(product.active)}
              onClick={() => onActivate(product, !product.active)}
            >
              <div style={switchDotStyle(product.active)} />
            </div>
          </Tooltip>

          <Tooltip title="Dupliquer">
            <button style={iconBtnStyle} onClick={() => onDuplicate(product)}>
              <HiDuplicate size={16} />
            </button>
          </Tooltip>

          <Tooltip title="Supprimer">
            <button
              style={{ ...iconBtnStyle, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
              onClick={() => onDeleteModalOpen(product)}
            >
              <HiTrash size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
    );
  }
);

export default ProductCard;
