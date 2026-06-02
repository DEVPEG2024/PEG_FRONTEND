import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@/components/ui';
import { ProductCategory } from '@/@types/product';
import { HiPencil, HiTrash, HiChevronDown, HiPlus } from 'react-icons/hi';
import { useState } from 'react';
import { pickCategoryIcon } from '@/utils/categoryIcon';

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
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 32px rgba(37,99,235,0.14)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(37,99,235,0.45)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px rgba(16,24,40,0.04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#eaedf3';
      }}
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #eaedf3',
        boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Icône + statut */}
      <div
        onClick={() => navigate(`/admin/products/categories/${productCategory.documentId}`)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32px 20px 12px',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <div style={{
          width: '88px', height: '88px', borderRadius: '20px',
          background: '#eef4ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={48} color="#2563eb" strokeWidth={1.6} />
        </div>

        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          background: active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
          border: `1px solid ${active ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: '100px', padding: '2px 8px',
          color: active ? '#16a34a' : '#dc2626',
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
        <p style={{ color: '#0b1f3a', fontWeight: 700, fontSize: '16px', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          {productCategory.name}
        </p>
        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{
            background: 'rgba(37,99,235,0.10)', border: '1px solid rgba(37,99,235,0.20)',
            borderRadius: '100px', padding: '2px 8px',
            color: '#2563eb', fontSize: '10px', fontWeight: 600,
          }}>
            {productCategory.products.length} produit{productCategory.products.length !== 1 ? 's' : ''}
          </span>
          {hasSubcategories && (
            <span style={{
              background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.22)',
              borderRadius: '100px', padding: '2px 8px',
              color: '#7c3aed', fontSize: '10px', fontWeight: 600,
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
              width: '100%', padding: '6px',
              background: '#faf5ff',
              border: 'none', borderTop: '1px solid #eef0f4',
              color: '#7c3aed', fontSize: '10px', fontWeight: 600,
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
              background: '#f8fafc',
              display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
              {subcategories.map((sub) => {
                const SubIcon = pickCategoryIcon(sub.name);
                return (
                  <div key={sub.documentId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 8px', borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #eef0f4',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#eef4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <SubIcon size={12} color="#2563eb" strokeWidth={1.8} />
                      </div>
                      <span style={{ color: '#475569', fontSize: '11px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditProductCategory(sub); }}
                        style={{
                          background: 'rgba(37,99,235,0.10)', border: '1px solid rgba(37,99,235,0.20)',
                          borderRadius: '4px', padding: '2px 4px', color: '#2563eb',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                        }}
                      >
                        <HiPencil size={9} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProductCategory(sub); }}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
                          borderRadius: '4px', padding: '2px 4px', color: '#dc2626',
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
        borderTop: '1px solid #eef0f4',
        padding: '10px 12px',
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
                background: active ? '#2563eb' : '#cbd5e1',
                position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}>
                <div style={{
                  position: 'absolute', top: '2px',
                  left: active ? '16px' : '2px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
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
                background: '#faf5ff', border: '1px solid rgba(139,92,246,0.25)',
                borderRadius: '8px', padding: '4px 8px',
                color: '#7c3aed', fontSize: '10px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.14)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#faf5ff')}
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
              background: 'rgba(37,99,235,0.10)', border: '1px solid rgba(37,99,235,0.22)',
              borderRadius: '10px', padding: '7px',
              color: '#2563eb', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37,99,235,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(37,99,235,0.10)')}
          >
            <HiPencil size={12} /> Modifier
          </button>
          <button
            onClick={() => handleDeleteProductCategory(productCategory)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
              borderRadius: '10px', padding: '7px 11px',
              color: '#dc2626', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.16)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          >
            <HiTrash size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCategoryCard;
