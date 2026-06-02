import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { ProductCategory } from '@/@types/product';
import { HiPencil, HiTrash, HiChevronDown, HiPlus } from 'react-icons/hi';
import { useState } from 'react';
import { pickCategoryIcon } from '@/utils/categoryIcon';

const GOLD = '#d4af37';
const GOLD_TITLE = '#ecd9a8';

const ProductCategoryCard = ({
  productCategory,
  handleEditProductCategory,
  handleDeleteProductCategory,
  handleActivateProductCategory,
  handleAddSubcategory,
}: {
  productCategory: ProductCategory;
  handleEditProductCategory: (productCategory: ProductCategory) => void;
  handleDeleteProductCategory: (productCategory: ProductCategory) => void;
  handleActivateProductCategory: (productCategory: ProductCategory, active: boolean) => void;
  handleAddSubcategory?: (parent: ProductCategory) => void;
}) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const subcategories = productCategory.subcategories ?? [];
  const hasSubcategories = subcategories.length > 0;
  const active = productCategory.active !== false;
  const Icon = pickCategoryIcon(productCategory.name);

  return (
    <div
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(212,175,55,0.45)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
      }}
      style={{
        background: 'linear-gradient(160deg, #131720 0%, #0c0d10 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        transition: 'transform 0.25s ease, border-color 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Photo (ou fond + icône si absente) */}
      <div
        onClick={() => navigate(`/admin/products/categories/${productCategory.documentId}`)}
        style={{
          position: 'relative', height: '140px', cursor: 'pointer', overflow: 'hidden',
        }}
      >
        {productCategory.image?.url ? (
          <img
            src={productCategory.image.url}
            alt={productCategory.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 50% 35%, #1c2433 0%, #0c0d10 78%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={42} color={GOLD} strokeWidth={1.6} style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }} />
          </div>
        )}

        {/* Dégradé bas */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.25) 45%, transparent 75%)',
          pointerEvents: 'none',
        }} />

        {/* Icône dorée en bas-gauche si photo présente */}
        {productCategory.image?.url && (
          <Icon size={22} color={GOLD} strokeWidth={1.7} style={{ position: 'absolute', left: '12px', bottom: '10px', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.7))' }} />
        )}

        {/* Statut */}
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: active ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${active ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.35)'}`,
          borderRadius: '100px', padding: '2px 8px',
          color: active ? '#4ade80' : '#fca5a5',
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase', backdropFilter: 'blur(6px)',
        }}>
          {active ? 'Actif' : 'Inactif'}
        </div>
      </div>

      {/* Nom + badges */}
      <div
        onClick={() => navigate(`/admin/products/categories/${productCategory.documentId}`)}
        style={{ padding: '12px 16px 12px', textAlign: 'center', flex: 1, cursor: 'pointer' }}
      >
        <p style={{ color: GOLD_TITLE, fontWeight: 700, fontSize: '14px', margin: '0 0 8px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
          {productCategory.name}
        </p>
        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
            borderRadius: '100px', padding: '2px 8px',
            color: '#6b9eff', fontSize: '10px', fontWeight: 600,
          }}>
            {productCategory.products.length} produit{productCategory.products.length !== 1 ? 's' : ''}
          </span>
          {hasSubcategories && (
            <span style={{
              background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
              borderRadius: '100px', padding: '2px 8px',
              color: '#a78bfa', fontSize: '10px', fontWeight: 600,
            }}>
              {subcategories.length} sous-cat.
            </span>
          )}
        </div>
      </div>

      {/* Sous-catégories */}
      {hasSubcategories && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              width: '100%', padding: '5px',
              background: 'rgba(139,92,246,0.06)',
              border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)',
              color: '#a78bfa', fontSize: '10px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            <HiChevronDown size={11} style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s',
            }} />
            {expanded ? 'Masquer' : 'Voir'} les sous-catégories
          </button>
          {expanded && (
            <div style={{
              padding: '6px 10px',
              background: 'rgba(0,0,0,0.25)',
              display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
              {subcategories.map((sub) => {
                const SubIcon = pickCategoryIcon(sub.name);
                return (
                  <div key={sub.documentId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      {sub.image?.url ? (
                        <img src={sub.image.url} alt={sub.name} style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <SubIcon size={16} color={GOLD} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                      )}
                      <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditProductCategory(sub); }}
                        style={{
                          background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.2)',
                          borderRadius: '4px', padding: '2px 4px', color: '#6b9eff',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                        }}
                      >
                        <HiPencil size={9} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProductCategory(sub); }}
                        style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '4px', padding: '2px 4px', color: '#f87171',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                        }}
                      >
                        <HiTrash size={9} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {/* Ligne 1 : activation + ajout sous-catégorie */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tooltip title={active ? 'Désactiver' : 'Activer'}>
            <div
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => handleActivateProductCategory(productCategory, !active)}
            >
              <div style={{
                width: '32px', height: '18px', borderRadius: '100px',
                background: active ? '#2f6fed' : 'rgba(255,255,255,0.12)',
                position: 'relative', transition: 'background 0.2s',
                boxShadow: active ? '0 0 8px rgba(47,111,237,0.45)' : 'none',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: '2px',
                  left: active ? '16px' : '2px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                }} />
              </div>
            </div>
          </Tooltip>
          {handleAddSubcategory && (
            <button
              onClick={() => handleAddSubcategory(productCategory)}
              title="Ajouter une sous-catégorie"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: '8px', padding: '4px 8px',
                color: '#a78bfa', fontSize: '10px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.22)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.12)')}
            >
              <HiPlus size={11} /> Sous-cat.
            </button>
          )}
        </div>
        {/* Ligne 2 : modifier + supprimer */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => handleEditProductCategory(productCategory)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: '8px', padding: '6px',
              color: GOLD_TITLE, fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212,175,55,0.22)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(212,175,55,0.12)')}
          >
            <HiPencil size={12} /> Modifier
          </button>
          <button
            onClick={() => handleDeleteProductCategory(productCategory)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px', padding: '6px 10px',
              color: '#f87171', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
          >
            <HiTrash size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCategoryCard;
