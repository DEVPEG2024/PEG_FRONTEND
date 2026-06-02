import { useEffect, useMemo, useRef, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import ProductCategoryListContent from './components/CategoryList';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  getCatalogueProductCategories,
  useAppSelector,
} from './store';
import { HiSearch } from 'react-icons/hi';

injectReducer('catalogue', reducer);

type Option = {
  value: number;
  label: string;
};
const options: Option[] = [
  { value: 16, label: '16 / page' },
  { value: 24, label: '24 / page' },
  { value: 32, label: '32 / page' },
];

const SkeletonCard = () => (
  <div style={{
    borderRadius: '20px',
    overflow: 'hidden',
    height: '230px',
    background: '#eef1f6',
    border: '1px solid #eaedf3',
    animation: 'pulse 1.5s ease-in-out infinite',
  }} />
);

const Categories = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [searchTerm, setSearchTerm] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const dispatch = useAppDispatch();
  const { total, productCategories, loading } = useAppSelector(
    (state) => state.catalogue.data
  );

  const fetchProductCategories = (page: number, size: number, term: string) => {
    dispatch(
      getCatalogueProductCategories({
        pagination: { page, pageSize: size },
        searchTerm: term,
      })
    );
  };

  useEffect(() => {
    fetchProductCategories(currentPage, pageSize, searchTerm);
  }, [currentPage, pageSize]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProductCategories(1, pageSize, value), 400);
  };

  const onPageSelect = ({ value }: Option) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  // Filter out inactive categories for clients
  const activeCategories = useMemo(
    () => productCategories.filter((c) => c.active !== false && !c.parent?.documentId),
    [productCategories]
  );

  const showPagination = total > pageSize;

  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      background: '#f7f9fc',
      borderRadius: '24px',
      padding: '32px',
      minHeight: 'calc(100vh - 120px)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '32px',
        flexWrap: 'wrap',
      }}>
        <div>
          <h3 style={{ margin: 0, color: '#0b1f3a', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Catalogue
          </h3>
          {!loading && activeCategories.length > 0 && (
            <p style={{ margin: '6px 0 0', color: '#2563eb', fontSize: '15px', fontWeight: 500 }}>
              {activeCategories.length} catégorie{activeCategories.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '260px', maxWidth: '400px', flex: 1 }}>
          <HiSearch
            size={18}
            style={{
              position: 'absolute',
              left: '18px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#2563eb',
              pointerEvents: 'none',
            }}
          />
          <input
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Rechercher une catégorie…"
            style={{
              width: '100%',
              background: '#ffffff',
              border: '1px solid #e6e9f0',
              borderRadius: '999px',
              padding: '13px 18px 13px 46px',
              color: '#0b1f3a',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
              boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(37,99,235,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e6e9f0'; e.target.style.boxShadow = '0 1px 2px rgba(16,24,40,0.04)'; }}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '20px',
        }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
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
            background: '#eef2f8',
            border: '1px solid #e6e9f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <HiSearch size={28} style={{ color: '#93a3bd' }} />
          </div>
          <div>
            <p style={{ color: '#0b1f3a', fontSize: '16px', fontWeight: 600, margin: 0 }}>
              {searchTerm ? 'Aucun résultat' : 'Aucune catégorie'}
            </p>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '6px 0 0' }}>
              {searchTerm
                ? `Aucune catégorie ne correspond à « ${searchTerm} »`
                : 'Les catégories apparaîtront ici'}
            </p>
          </div>
        </div>
      ) : (
        <ProductCategoryListContent productCategories={activeCategories} />
      )}

      {/* Pagination */}
      {showPagination && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '28px' }}>
          <Pagination
            total={total}
            currentPage={currentPage}
            pageSize={pageSize}
            onChange={(page) => setCurrentPage(page)}
          />
          <div style={{ minWidth: 120 }}>
            <Select
              size="sm"
              isSearchable={false}
              defaultValue={options[0]}
              options={options}
              onChange={(selected) => onPageSelect(selected as Option)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
