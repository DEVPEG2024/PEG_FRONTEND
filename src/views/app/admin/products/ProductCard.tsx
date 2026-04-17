import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { HiDuplicate, HiPencil, HiTrash } from 'react-icons/hi';
import { Product } from '@/@types/product';
import { getProductBasePrice } from '@/utils/productHelpers';
import { toTTC, fmtHT, fmtTTC, fmtNum, arePricesHidden } from '@/utils/priceHelpers';
import { memo, useRef } from 'react';

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
    const cardRef = useRef<HTMLDivElement>(null);
    const imageUrl = product.images[0]?.url;
    const initial = (product.name || '?').charAt(0).toUpperCase();
    const price = arePricesHidden() ? '•••••' : fmtNum(getProductBasePrice(product));

    const handleMouseEnter = () => {
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateY(-4px)';
        cardRef.current.style.boxShadow = '0 20px 44px rgba(0,0,0,0.5), 0 0 0 1px rgba(47,111,237,0.2)';
      }
    };
    const handleMouseLeave = () => {
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateY(0)';
        cardRef.current.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)';
      }
    };

    return (
      <div
        ref={cardRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        }}
      >
        {/* Image zone */}
        <div style={{ position: 'relative', height: '180px', background: '#fff', flexShrink: 0 }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', padding: '10px', boxSizing: 'border-box' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'radial-gradient(ellipse at 50% 40%, rgba(47,111,237,0.12) 0%, transparent 70%)',
            }}>
              <span style={{ fontSize: '52px', fontWeight: 800, color: 'rgba(47,111,237,0.25)', letterSpacing: '-0.04em' }}>
                {initial}
              </span>
            </div>
          )}

          {/* Status badge */}
          <div style={{
            position: 'absolute', top: '10px', right: '10px',
            background: product.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${product.active ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: '100px', padding: '3px 9px',
            color: product.active ? '#4ade80' : '#fca5a5',
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {product.active ? 'Actif' : 'Inactif'}
          </div>

          {/* Category badge */}
          {product.productCategory?.name && (
            <div style={{
              position: 'absolute', top: '10px', left: '10px',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '100px', padding: '3px 9px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.03em',
            }}>
              {product.productCategory.name}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>

          {/* Name */}
          <p style={{
            color: '#fff', fontWeight: 700, fontSize: '13px',
            letterSpacing: '-0.01em', lineHeight: 1.4, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {product.name}
          </p>

          {/* Price + ref */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {price} <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>€ HT</span>
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                {fmtTTC(toTTC(getProductBasePrice(product)))}
              </span>
            </div>
            {product.productRef && (
              <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', letterSpacing: '0.03em' }}>
                {product.productRef}
              </span>
            )}
          </div>

          {/* Sizes + colors count */}
          {(product.sizes?.length > 0 || product.colors?.length > 0) && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {product.sizes?.length > 0 && (
                <span style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px', padding: '2px 8px',
                  color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600,
                }}>
                  {product.sizes.length} taille{product.sizes.length > 1 ? 's' : ''}
                </span>
              )}
              {product.colors?.length > 0 && (
                <span style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px', padding: '2px 8px',
                  color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600,
                }}>
                  {product.colors.length} couleur{product.colors.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Edit button */}
          <button
            onClick={() => navigate(`/admin/products/edit/${product.documentId}`)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
              border: 'none', borderRadius: '10px', width: '100%',
              padding: '10px', color: '#fff', fontSize: '12px', fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 3px 12px rgba(47,111,237,0.35)',
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em',
            }}
          >
            <HiPencil size={13} /> Modifier
          </button>

          {/* Secondary actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Active toggle */}
            <Tooltip title={product.active ? 'Désactiver' : 'Activer'}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}
                onClick={() => onActivate(product, !product.active)}
              >
                <div style={{
                  width: '34px', height: '19px', borderRadius: '100px',
                  background: product.active ? '#2f6fed' : 'rgba(255,255,255,0.12)',
                  position: 'relative', transition: 'background 0.2s',
                  boxShadow: product.active ? '0 0 8px rgba(47,111,237,0.45)' : 'none',
                  flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: '2px',
                    left: product.active ? '17px' : '2px',
                    width: '15px', height: '15px', borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  }} />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
                  {product.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </Tooltip>

            <div style={{ display: 'flex', gap: '6px' }}>
              <Tooltip title="Dupliquer">
                <button
                  style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.55)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onClick={() => onDuplicate(product)}
                >
                  <HiDuplicate size={14} />
                </button>
              </Tooltip>
              <Tooltip title="Supprimer">
                <button
                  style={{
                    width: '30px', height: '30px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
                    color: '#f87171', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onClick={() => onDeleteModalOpen(product)}
                >
                  <HiTrash size={14} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default ProductCard;
