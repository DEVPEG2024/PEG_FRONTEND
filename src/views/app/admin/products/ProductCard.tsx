import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { HiDuplicate, HiPencil, HiPhotograph, HiTrash } from 'react-icons/hi';
import { Product } from '@/@types/product';
import { getProductBasePrice } from '@/utils/productHelpers';
import { memo } from 'react';

const sep: React.CSSProperties = {
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 75%, transparent)',
  margin: '18px 0',
};

const iconBtn = (danger = false): React.CSSProperties => ({
  width: '34px',
  height: '34px',
  borderRadius: '9px',
  background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)',
  border: `1px solid ${danger ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.1)'}`,
  color: danger ? '#f87171' : 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s',
  flexShrink: 0,
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
      <div style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '18px',
        padding: '22px',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
      }}>

        {/* Titre + statut */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
          <p style={{
            color: '#fff',
            fontWeight: 600,
            fontSize: '14px',
            letterSpacing: '-0.01em',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1,
          }}>
            {product.name}
          </p>
          {!product.active && (
            <span style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '6px',
              padding: '3px 8px',
              color: '#fca5a5',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              Inactif
            </span>
          )}
        </div>

        {/* Séparateur */}
        <div style={sep} />

        {/* Image */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '148px',
          marginBottom: '16px',
        }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              style={{ maxHeight: '124px', width: '100%', objectFit: 'contain' }}
            />
          ) : (
            <HiPhotograph size={40} style={{ color: 'rgba(255,255,255,0.12)' }} />
          )}
        </div>

        {/* Prix + ref */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{
            background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            borderRadius: '100px',
            padding: '6px 18px',
            color: '#fff',
            fontWeight: 700,
            fontSize: '16px',
            letterSpacing: '-0.02em',
            boxShadow: '0 3px 12px rgba(47,111,237,0.4)',
          }}>
            {getProductBasePrice(product).toFixed(2)} €
          </span>
          {product.productRef && (
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px', letterSpacing: '0.02em' }}>
              Réf. {product.productRef}
            </span>
          )}
        </div>

        {/* Séparateur */}
        <div style={sep} />

        {/* Actions — ligne principale */}
        <button
          onClick={() => navigate(`/admin/products/edit/${product.documentId}`)}
          style={{
            background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            borderRadius: '11px',
            width: '100%',
            padding: '11px',
            color: '#fff',
            fontWeight: 600,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            boxShadow: '0 3px 14px rgba(47,111,237,0.35)',
            marginBottom: '12px',
          }}
        >
          <HiPencil size={14} />
          Modifier le produit
        </button>

        {/* Actions secondaires */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Toggle actif */}
          <Tooltip title={product.active ? 'Désactiver' : 'Activer'}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              onClick={() => onActivate(product, !product.active)}
            >
              <div style={{
                width: '38px',
                height: '21px',
                borderRadius: '100px',
                background: product.active ? '#2f6fed' : 'rgba(255,255,255,0.12)',
                position: 'relative',
                transition: 'background 0.2s',
                boxShadow: product.active ? '0 0 8px rgba(47,111,237,0.5)' : 'none',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: product.active ? '20px' : '3px',
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
                {product.active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </Tooltip>

          {/* Icônes */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <Tooltip title="Dupliquer">
              <button style={iconBtn()} onClick={() => onDuplicate(product)}>
                <HiDuplicate size={15} />
              </button>
            </Tooltip>
            <Tooltip title="Supprimer">
              <button style={iconBtn(true)} onClick={() => onDeleteModalOpen(product)}>
                <HiTrash size={15} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }
);

export default ProductCard;
