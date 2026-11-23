import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { HiDuplicate, HiOutlineGlobeAlt, HiOutlineTag, HiOutlineUser, HiPencil, HiTrash } from 'react-icons/hi';
import { Product } from '@/@types/product';
import { getProductBasePrice, getProductCost, getUnitMargin, getMarginRate, getCatalogueVisibilityIssues } from '@/utils/productHelpers';
import { toTTC, fmtHT, fmtTTC, fmtNum } from '@/utils/priceHelpers';
import { memo, useRef, useState } from 'react';
import ProductBadges from '@/components/shared/ProductBadges';
import { offerAudience } from './offerAudience';

/** Clients listés au survol ; au-delà : « + N autres ». */
const MAX_AUDIENCE_LINES = 6;

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
    const price = fmtNum(getProductBasePrice(product));
    const cost = getProductCost(product);
    const basePrice = getProductBasePrice(product);
    const unitMargin = getUnitMargin(basePrice, cost);
    const marginRate = getMarginRate(basePrice, cost);
    const showMargin = cost > 0;
    const visibilityIssues = getCatalogueVisibilityIssues(product);
    // À qui appartient l'offre : montré au survol de la carte (demande du 23/11/2026)
    const audience = offerAudience(product);
    const [hovered, setHovered] = useState(false);
    const audienceLines = [
      ...audience.customers.map((name) => ({ key: `c-${name}`, icon: <HiOutlineUser size={13} />, text: name })),
      ...audience.sectors.map((name) => ({ key: `s-${name}`, icon: <HiOutlineTag size={13} />, text: `Secteur : ${name}` })),
    ];
    const hiddenLines = Math.max(0, audienceLines.length - MAX_AUDIENCE_LINES);

    const handleMouseEnter = () => {
      setHovered(true);
      if (cardRef.current) {
        cardRef.current.style.transform = 'translateY(-4px)';
        cardRef.current.style.boxShadow = '0 20px 44px rgba(0,0,0,0.5), 0 0 0 1px rgba(47,111,237,0.2)';
      }
    };
    const handleMouseLeave = () => {
      setHovered(false);
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
              loading="lazy"
              decoding="async"
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

          {/* Badges posés sur le produit (« Nouveau », « Promo »…) */}
          <ProductBadges documentId={product.documentId} layout="row" style={{ position: 'absolute', left: '10px', bottom: '10px', right: '10px' }} />

          {/* Survol : à qui appartient l'offre */}
          <div
            role="tooltip"
            aria-hidden={!hovered}
            style={{
              position: 'absolute', inset: 0, zIndex: 2,
              background: 'rgba(8,14,28,0.92)',
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              padding: '14px 16px', boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', gap: '8px',
              opacity: hovered ? 1 : 0, transition: 'opacity 0.18s ease',
              pointerEvents: 'none', overflow: 'hidden',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Pour qui ?
            </span>
            <span style={{
              color: audience.nobody ? '#fca5a5' : '#fff', fontSize: '14px', fontWeight: 800,
              letterSpacing: '-0.01em', lineHeight: 1.3,
            }}>
              {audience.title}
            </span>
            {audienceLines.length > 1 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px', minHeight: 0 }}>
                {audienceLines.slice(0, MAX_AUDIENCE_LINES).map((line) => (
                  <li key={line.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 600, minWidth: 0 }}>
                    <span style={{ color: '#6b9eff', display: 'flex', flexShrink: 0 }}>{line.icon}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.text}</span>
                  </li>
                ))}
                {hiddenLines > 0 && (
                  <li style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600 }}>
                    + {hiddenLines} autre{hiddenLines > 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            )}
            {audience.publicCatalogue && (audience.customers.length > 0 || audience.sectors.length > 0) && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600 }}>
                <HiOutlineGlobeAlt size={13} /> Aussi au catalogue public
              </span>
            )}
            {audience.nobody && (
              <span style={{ color: 'rgba(252,165,165,0.85)', fontSize: '11px', lineHeight: 1.45 }}>
                Hors catalogue et rattachée à aucun client ni secteur : personne ne la voit.
              </span>
            )}
          </div>
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

          {/* Alerte : invisible dans le catalogue client */}
          {visibilityIssues.length > 0 && (
            <div style={{
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.30)',
              borderRadius: '8px', padding: '6px 9px',
            }}>
              <p style={{ margin: 0, color: '#f87171', fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                ⚠ Invisible côté client
              </p>
              <p style={{ margin: '3px 0 0', color: 'rgba(252,165,165,0.85)', fontSize: '11px', lineHeight: 1.45 }}>
                {visibilityIssues.join(' · ')}
              </p>
            </div>
          )}

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

          {/* Marge (admin only — réf. interne) */}
          {showMargin && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start',
              background: unitMargin >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${unitMargin >= 0 ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)'}`,
              borderRadius: '8px', padding: '4px 9px',
            }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Marge
              </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: unitMargin >= 0 ? '#4ade80' : '#f87171' }}>
                {fmtNum(unitMargin)} €{marginRate != null ? ` · ${marginRate}%` : ''}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                (revient {fmtNum(cost)} €)
              </span>
            </div>
          )}

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
                  className="peg-tap-target"
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
                  className="peg-tap-target"
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
