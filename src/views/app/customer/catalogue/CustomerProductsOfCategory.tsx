import { injectReducer } from '@/store';
import reducer, {
  useAppDispatch,
  useAppSelector,
  getCatalogueProductsByCategory,
  getCatalogueProductCategoryById,
  clearStateSpecificCategory,
} from './store';
import { useEffect, useState } from 'react';
import { isEmpty } from 'lodash';
import { useNavigate, useParams } from 'react-router-dom';
import { Product } from '@/@types/product';
import CustomerProductCard from '../products/lists/CustomerProductCard';
import GridItem from './components/GridItem';

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
  const { products, productCategory, loading, total } = useAppSelector(
    (state) => state.catalogue.data
  );
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    if (!productCategory) {
      dispatch(getCatalogueProductCategoryById(documentId));
    } else {
      dispatch(
        getCatalogueProductsByCategory({
          pagination: { page, pageSize: PAGE_SIZE },
          searchTerm: '',
          productCategoryDocumentId: productCategory?.documentId,
        })
      );
    }
  }, [dispatch, productCategory, page]);

  useEffect(() => {
    setPage(1);
    return () => {
      dispatch(clearStateSpecificCategory());
    };
  }, [documentId]);

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

      {/* Sous-catégories — mêmes cartes que le catalogue */}
      {!loading && productCategory?.subcategories && productCategory.subcategories.filter((s) => s.active !== false).length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Sous-catégories
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '20px',
          }}>
            {productCategory.subcategories.filter((s) => s.active !== false).map((sub) => (
              <GridItem key={sub.documentId} data={sub} />
            ))}
          </div>
        </div>
      )}

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

      {/* Pagination */}
      {!loading && pageCount > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: page === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
              color: page === 1 ? 'rgba(160,185,220,0.3)' : '#a0b9dc',
              cursor: page === 1 ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            ← Précédent
          </button>

          {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: p === page ? 'none' : '1px solid rgba(255,255,255,0.1)',
                background: p === page ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.04)',
                color: p === page ? '#fff' : '#a0b9dc',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: p === page ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: page === pageCount ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
              color: page === pageCount ? 'rgba(160,185,220,0.3)' : '#a0b9dc',
              cursor: page === pageCount ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerProductsOfCategory;
