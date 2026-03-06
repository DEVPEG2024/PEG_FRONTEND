import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';
import { HiPencil, HiTrash, HiPhotograph } from 'react-icons/hi';

const ProductCategoryCard = ({
  productCategory,
  handleEditProductCategory,
  handleDeleteProductCategory,
}: {
  productCategory: ProductCategory;
  handleEditProductCategory: (productCategory: ProductCategory) => void;
  handleDeleteProductCategory: (productCategory: ProductCategory) => void;
}) => {
  const navigate = useNavigate();

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
      {/* Image */}
      <div
        onClick={() => navigate(`/admin/products/categories/${productCategory.documentId}`)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px 16px 16px',
          background: 'rgba(255,255,255,0.02)',
          cursor: 'pointer',
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
            <HiPhotograph size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        )}
      </div>

      {/* Name + count */}
      <div
        onClick={() => navigate(`/admin/products/categories/${productCategory.documentId}`)}
        style={{ padding: '0 16px 16px', textAlign: 'center', flex: 1, cursor: 'pointer' }}
      >
        <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          {productCategory.name}
        </p>
        <span style={{
          background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
          borderRadius: '100px', padding: '2px 10px',
          color: '#6b9eff', fontSize: '11px', fontWeight: 600,
        }}>
          {productCategory.products.length} produit{productCategory.products.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: '8px', padding: '10px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button
          onClick={() => handleEditProductCategory(productCategory)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
            borderRadius: '8px', padding: '7px',
            color: '#6b9eff', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(47,111,237,0.22)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(47,111,237,0.12)')}
        >
          <HiPencil size={13} /> Modifier
        </button>
        <button
          onClick={() => handleDeleteProductCategory(productCategory)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px', padding: '7px 11px',
            color: '#f87171', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
        >
          <HiTrash size={13} />
        </button>
      </div>
    </div>
  );
};

export default ProductCategoryCard;
