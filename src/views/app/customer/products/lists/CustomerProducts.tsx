import { injectReducer } from '@/store';
import reducer, {
  getCustomerProducts,
  useAppDispatch,
  useAppSelector,
  setProduct,
} from '../store';
import { useEffect, useRef, useState } from 'react';
import { isEmpty } from 'lodash';
import CustomerProductCard from './CustomerProductCard';
import { User } from '@/@types/user';
import { HiSearch } from 'react-icons/hi';

injectReducer('customerProducts', reducer);

const SkeletonCard = () => (
  <div style={{
    background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
    borderRadius: '18px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  }}>
    <div style={{ height: '200px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ height: '14px', borderRadius: '6px', background: 'rgba(255,255,255,0.07)', width: '75%' }} />
      <div style={{ height: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', width: '55%' }} />
      <div style={{ height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', marginTop: '8px' }} />
    </div>
  </div>
);

const CustomerProducts = () => {
  const { user }: { user?: User } = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { products, loading } = useAppSelector(
    (state) => state.customerProducts.data
  );
  const [searchTerm, setSearchTerm] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchProducts = (term: string) => {
    dispatch(
      getCustomerProducts({
        page: 1,
        pageSize: 100,
        searchTerm: term,
        customerDocumentId: user?.customer?.documentId || '',
        customerCategoryDocumentId: user?.customer?.customerCategory?.documentId || '',
      })
    );
  };

  useEffect(() => {
    dispatch(setProduct(null));
    fetchProducts('');
  }, [dispatch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(value), 400);
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 700 }}>
            Mes offres personnalisées
          </h3>
          {!loading && !isEmpty(products) && (
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
              {products.length} produit{products.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px', maxWidth: '360px', flex: 1 }}>
          <HiSearch
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.55)',
              pointerEvents: 'none',
            }}
          />
          <input
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Rechercher un produit…"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '9px 14px 9px 36px',
              color: '#fff',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isEmpty(products) ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          gap: '16px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <HiSearch size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
              {searchTerm ? 'Aucun résultat' : 'Aucune offre personnalisée'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: '6px 0 0' }}>
              {searchTerm
                ? `Aucun produit ne correspond à « ${searchTerm} »`
                : 'Vos offres personnalisées apparaîtront ici'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          {products.map((product) => (
            <CustomerProductCard key={product.documentId} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerProducts;
