import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { ProductCategory } from '@/@types/product';
import { HiPencil, HiTrash, HiPhotograph, HiChevronDown, HiPlus } from 'react-icons/hi';
import { useState } from 'react';

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

  return (
    <div
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.45)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      }}
      style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '16px',
        border: '1.5px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image + status */}
      <div
        onClick={() => navigate(`/admin/products/categories/${productCategory.documentId}`)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 20px 16px',
          background: 'rgba(255,255,255,0.02)',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        {productCategory.image?.url ? (
          <img
            src={productCategory.image.url}
            alt={productCategory.name}
            style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
          />
        ) : (
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HiPhotograph size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        )}

        <div style={{
          position: 'absolute', top: '8px', right: '8px',
          background: productCategory.active !== false ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${productCategory.active !== false ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: '100px', padding: '2px 8px',
          color: productCategory.active !== false ? '#4ade80' : '#fca5a5',
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {productCategory.active !== false ? 'Actif' : 'Inactif'}
        </div>
      </div>

      {/* Name + badges */}
      <div
        onClick={() => navigate(`/admin/products/categories/${productCategory.documentId}`)}
        style={{ padding: '0 16px 14px', textAlign: 'center', flex: 1, cursor: 'pointer' }}
      >
        <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
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

      {/* Subcategories expand */}
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
              background: 'rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column', gap: '3px',
            }}>
              {subcategories.map((sub) => (
                <div key={sub.documentId} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '5px 8px', borderRadius: '6px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    {sub.image?.url ? (
                      <img src={sub.image.url} alt={sub.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <HiPhotograph size={8} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '10px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
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
              ))}
            </div>
          )}
        </>
      )}

      {/* Actions — 2 rows for clarity */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {/* Row 1: toggle + add subcategory */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tooltip title={productCategory.active !== false ? 'Désactiver' : 'Activer'}>
            <div
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => handleActivateProductCategory(productCategory, productCategory.active === false)}
            >
              <div style={{
                width: '32px', height: '18px', borderRadius: '100px',
                background: productCategory.active !== false ? '#2f6fed' : 'rgba(255,255,255,0.12)',
                position: 'relative', transition: 'background 0.2s',
                boxShadow: productCategory.active !== false ? '0 0 8px rgba(47,111,237,0.45)' : 'none',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: '2px',
                  left: productCategory.active !== false ? '16px' : '2px',
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
                borderRadius: '6px', padding: '4px 8px',
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
        {/* Row 2: edit + delete */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => handleEditProductCategory(productCategory)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
              borderRadius: '8px', padding: '6px',
              color: '#6b9eff', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(47,111,237,0.22)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(47,111,237,0.12)')}
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
