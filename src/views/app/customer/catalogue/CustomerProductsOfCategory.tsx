import { injectReducer } from '@/store';
import reducer, {
  useAppDispatch,
  useAppSelector,
  getCatalogueProductsByCategory,
  getCatalogueProductCategoryById,
  clearStateSpecificCategory,
} from './store';
import { useEffect } from 'react';
import { isEmpty } from 'lodash';
import { useParams } from 'react-router-dom';
import { Product } from '@/@types/product';
import CustomerProductCard from '../products/lists/CustomerProductCard';

injectReducer('catalogue', reducer);

type ShowCustomerProductsOfCategoryParams = {
  documentId: string;
};

const SkeletonCard = () => (
  <div style={{
    background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.06)',
  }}>
    <div style={{ height: '200px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ height: '14px', borderRadius: '6px', background: 'rgba(255,255,255,0.07)', width: '70%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', width: '45%', animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  </div>
);

const CustomerProductsOfCategory = () => {
  const { documentId } =
    useParams<ShowCustomerProductsOfCategoryParams>() as ShowCustomerProductsOfCategoryParams;
  const dispatch = useAppDispatch();
  const { products, productCategory, loading } = useAppSelector(
    (state) => state.catalogue.data
  );

  useEffect(() => {
    if (!productCategory) {
      dispatch(getCatalogueProductCategoryById(documentId));
    } else {
      dispatch(
        getCatalogueProductsByCategory({
          pagination: { page: 1, pageSize: 10 },
          searchTerm: '',
          productCategoryDocumentId: productCategory?.documentId,
        })
      );
    }
  }, [dispatch, productCategory]);

  useEffect(() => {
    return () => {
      dispatch(clearStateSpecificCategory());
    };
  }, []);

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          margin: 0,
          fontSize: '22px',
          fontWeight: 700,
          color: '#f0f4ff',
          letterSpacing: '-0.01em',
        }}>
          {productCategory?.name ?? '—'}
        </h2>
        {!loading && (
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(160,185,220,0.7)' }}>
            {products.length} produit{products.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Skeleton */}
      {loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty(products) && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px',
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }}>📦</div>
          <p style={{ margin: 0, color: 'rgba(160,185,220,0.6)', fontSize: '15px' }}>
            Aucun produit dans cette catégorie
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && !isEmpty(products) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          {products.map((product: Product) => (
            <CustomerProductCard key={product.documentId} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerProductsOfCategory;
