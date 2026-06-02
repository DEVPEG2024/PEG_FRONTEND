import { useEffect, useMemo, useRef, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import ProductCategoryListContent from './components/CategoryList';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  getCatalogueProductCategories,
  useAppSelector,
} from './store';
import { HiSearch } from 'react-icons/hi';
import CatalogueBanner from '@/views/app/common/categories/CatalogueBanner';

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
    borderRadius: '18px',
    overflow: 'hidden',
    height: '230px',
    background: 'linear-gradient(160deg, #131c2b 0%, #0c1320 100%)',
    border: '1px solid rgba(255,255,255,0.07)',
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
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Bannière */}
      <CatalogueBanner />

      {/* Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
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
