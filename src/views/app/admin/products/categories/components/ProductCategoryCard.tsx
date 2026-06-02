import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { ProductCategory } from '@/@types/product';
import { HiPencil, HiTrash, HiChevronDown, HiPlus } from 'react-icons/hi';
import { useState } from 'react';
import { pickCategoryIcon, pickCategoryColor } from '@/utils/categoryIcon';

// Convertit un hex (#rrggbb) en rgba avec alpha
const rgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

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
  const color = pickCategoryColor(productCategory.name);

  return (
    <div
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.borderColor = rgba(color, 0.5);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
      }}
      style={{
        position: 'relative',
        background: 'linear-gradient(160deg, #131c2b 0%, #0c1320 100%)',
        borderRadius: '18px',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        transition: 'transform 0.25s ease, border-color 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Halo coloré diffus en haut */}
      <div style={{
        position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
        width: '160px', height: '120px',
        background: `radial-gradient(circle, ${rgba(color, 0.16)} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Icône néon + statut */}
      <div
        onClick={() => navigate(`/admin/products/categories/${productCategory.documentId}`)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '30px 20px 14px',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <Icon
          size={52}
          color={color}
          strokeWidth={1.6}
          style={{ filter: `drop-shadow(0 0 8px ${rgba(color, 0.55)})` }}
        />

        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          background: active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${active ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: '100px', padding: '2px 8px',
          color: active ? '#4ade80' : '#fca5a5',
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {active ? 'Actif' : 'Inactif'}
        </div>
      </div>

      {/* Nom + badges */}
      <div
        onClick={() => navigate(`/admin/products/categories/${productCategory.documentId}`)}
        style={{ padding: '0 16px 14px', textAlign: 'center', flex: 1, cursor: 'pointer' }}
      >
        <p style={{ color: '#eaf0f7', fontWeight: 600, fontSize: '15px', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
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
              background: 'rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
              {subcategories.map((sub) => {
                const SubIcon = pickCategoryIcon(sub.name);
                const subColor = pickCategoryColor(sub.name);
                return (
                  <div key={sub.documentId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <SubIcon size={16} color={subColor} strokeWidth={1.8} style={{ flexShrink: 0, filter: `drop-shadow(0 0 5px ${rgba(subColor, 0.5)})` }} />
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

      {/* Liseré lumineux en bas (couleur de la catégorie) */}
      <div style={{
        position: 'absolute', bottom: 0, left: '18%', right: '18%',
        height: '2px', borderRadius: '999px',
        background: color, opacity: 0.85,
        boxShadow: `0 0 14px 1px ${rgba(color, 0.6)}`,
        pointerEvents: 'none',
      }} />
    </div>
  );
};

export default ProductCategoryCard;
