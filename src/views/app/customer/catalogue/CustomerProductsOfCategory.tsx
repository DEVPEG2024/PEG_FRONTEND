import { injectReducer } from '@/store';
import reducer, {
  useAppDispatch,
  useAppSelector,
  getCatalogueProductsByCategory,
  getCatalogueProductCategoryById,
  clearStateSpecificCategory,
} from './store';
import { useEffect, useRef, useState } from 'react';
import { isEmpty } from 'lodash';
import { useNavigate, useParams } from 'react-router-dom';
import { Product } from '@/@types/product';
import { HiOutlineHome, HiChevronRight, HiArrowLeft, HiArrowRight, HiOutlineViewGrid, HiOutlineCube } from 'react-icons/hi';
import CustomerProductCard from '../products/lists/CustomerProductCard';
import SubCategoryCard from './components/SubCategoryCard';
import { pickCategoryTagline } from '@/utils/categoryIcon';

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
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { products, productCategory, loading, total } = useAppSelector(
    (state) => state.catalogue.data
  );
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(total / PAGE_SIZE);

  const activeSubs = (productCategory?.subcategories ?? []).filter((s) => s.active !== false);
  const subProductsTotal = activeSubs.reduce((sum, s) => sum + (s.products?.length ?? 0), 0);
  const productsCount = total || subProductsTotal || products.length;
  const heroDescription =
    pickCategoryTagline(productCategory?.name ?? '') ||
    (activeSubs.length
      ? `${activeSubs.slice(0, 4).map((s) => s.name).join(', ')}${activeSubs.length > 4 ? ' et plus encore' : ''}.`
      : 'Découvrez notre sélection personnalisée, à votre image.');

  const scrollBy = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });

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
    <div style={{ padding: '0', fontFamily: 'Inter, sans-serif' }}>
      {/* Fil d'Ariane */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13.5px' }}>
        <HiOutlineHome
          size={17}
          style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
          onClick={() => navigate('/customer/catalogue')}
        />
        <HiChevronRight size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
        <span
          onClick={() => navigate('/customer/catalogue')}
          style={{ color: '#a99bff', fontWeight: 600, cursor: 'pointer' }}
        >
          Catalogue
        </span>
        <HiChevronRight size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
        <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{productCategory?.name ?? '—'}</span>
      </div>

      {/* Héro catégorie */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)', marginBottom: '30px', minHeight: '230px',
        display: 'flex', alignItems: 'center',
        background: 'radial-gradient(120% 160% at 78% 8%, rgba(124,107,255,0.30) 0%, rgba(91,71,224,0.08) 40%, rgba(10,12,22,0.35) 72%), linear-gradient(160deg, #12152a 0%, #0a0c16 100%)',
      }}>
        {/* bannière produits (fond) — toujours la bannière PEG */}
        <img
          src="/img/illustrations/category-hero.png"
          alt={productCategory?.name ?? 'Catégorie'}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'right center', display: 'block' }}
        />
        {/* voile dégradé pour la lisibilité du texte à gauche */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to right, rgba(8,10,18,0.96) 0%, rgba(8,10,18,0.88) 28%, rgba(8,10,18,0.45) 52%, rgba(8,10,18,0.05) 72%, transparent 100%)',
        }} />

        {/* contenu */}
        <div style={{ position: 'relative', zIndex: 2, padding: '40px 44px', maxWidth: '640px' }}>
          <h1 style={{ color: '#fff', fontSize: '34px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 12px' }}>
            {productCategory?.name ?? '—'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', lineHeight: 1.55, margin: '0 0 26px', maxWidth: '480px' }}>
            {heroDescription}
          </p>

          {/* chips stats */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {[
              { icon: <HiOutlineViewGrid size={22} />, value: activeSubs.length, label: 'sous-catégories' },
              { icon: <HiOutlineCube size={22} />, value: productsCount, label: 'produits disponibles' },
            ].map((chip) => (
              <div key={chip.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '12px 20px 12px 14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(124,107,255,0.14)', border: '1px solid rgba(124,107,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a99bff', flexShrink: 0 }}>
                  {chip.icon}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: '23px', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>{chip.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12.5px', marginTop: '4px' }}>{chip.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sous-catégories — carrousel */}
      {!loading && activeSubs.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ color: '#fff', fontSize: '19px', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>Sous-catégories</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[{ d: -1, icon: <HiArrowLeft size={17} /> }, { d: 1, icon: <HiArrowRight size={17} /> }].map((b) => (
                <button key={b.d} onClick={() => scrollBy(b.d)}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.75)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s, border-color 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,107,255,0.18)'; e.currentTarget.style.borderColor = 'rgba(124,107,255,0.5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
                >
                  {b.icon}
                </button>
              ))}
            </div>
          </div>
          <div ref={scrollRef} className="subcat-scroll" style={{ display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: '4px' }}>
            {activeSubs.map((sub) => (
              <SubCategoryCard key={sub.documentId} data={sub} />
            ))}
          </div>
          <style>{`.subcat-scroll::-webkit-scrollbar{display:none;} .subcat-scroll{scrollbar-width:none;}`}</style>
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
