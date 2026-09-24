import { useEffect, useMemo, useRef, useState } from 'react';
import ProductCategoryListContent from './components/CategoryList';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  getCatalogueProductCategories,
  useAppSelector,
} from './store';
import { HiOutlineSparkles, HiOutlineViewGrid, HiSearch } from 'react-icons/hi';
import CatalogueBanner from '@/views/app/common/categories/CatalogueBanner';
import SuggestionsTab from './components/SuggestionsTab';

injectReducer('catalogue', reducer);

// Toutes les catégories sur une seule page (pas de pagination côté client).
const ALL = { page: 1, pageSize: 1000 };

const SkeletonCard = () => (
  <div style={{
    borderRadius: '16px',
    overflow: 'hidden',
    aspectRatio: '3 / 2',
    background: 'linear-gradient(160deg, #1a1530 0%, #0c0d10 100%)',
    border: '1px solid rgba(255,255,255,0.07)',
    animation: 'pulse 1.5s ease-in-out infinite',
  }} />
);

const TABS: { key: 'categories' | 'suggestions'; label: string; icon: JSX.Element }[] = [
  { key: 'categories', label: 'Catégories', icon: <HiOutlineViewGrid size={15} /> },
  { key: 'suggestions', label: 'Nos suggestions', icon: <HiOutlineSparkles size={15} /> },
];

const Categories = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'suggestions'>('categories');
  const [searchTerm, setSearchTerm] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const dispatch = useAppDispatch();
  const { productCategories, loading } = useAppSelector(
    (state) => state.catalogue.data
  );

  const fetchProductCategories = (term: string) => {
    dispatch(
      getCatalogueProductCategories({
        pagination: ALL,
        searchTerm: term,
      })
    );
  };

  useEffect(() => {
    fetchProductCategories(searchTerm);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProductCategories(value), 400);
  };

  // Filter out inactive categories for clients
  const activeCategories = useMemo(
    () => productCategories.filter((c) => c.active !== false && !c.parent?.documentId),
    [productCategories]
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Bannière */}
      <CatalogueBanner
        aspect="3.4 / 1"
        minHeight="220px"
        maxHeight="380px"
      />

      {/* Onglets Catégories / Suggestions */}
      <div className="peg-scroll-x" style={{ display: 'flex', gap: '8px', margin: '20px 0 24px' }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 18px', borderRadius: '100px', cursor: 'pointer',
                border: active ? '1px solid rgba(109,93,252,0.5)' : '1px solid rgba(255,255,255,0.1)',
                background: active ? 'rgba(109,93,252,0.16)' : 'rgba(255,255,255,0.03)',
                color: active ? '#a99bff' : 'rgba(255,255,255,0.55)',
                fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'suggestions' ? (
        <SuggestionsTab />
      ) : (
      <>
      {/* Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(330px, 100%), 1fr))',
          gap: '20px',
        }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : activeCategories.length === 0 ? (
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
              {searchTerm ? 'Aucun résultat' : 'Aucune catégorie'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: '6px 0 0' }}>
              {searchTerm
                ? `Aucune catégorie ne correspond à « ${searchTerm} »`
                : 'Les catégories apparaîtront ici'}
            </p>
          </div>
        </div>
      ) : (
        <ProductCategoryListContent productCategories={activeCategories} />
      )}
      </>
      )}
    </div>
  );
};

export default Categories;
