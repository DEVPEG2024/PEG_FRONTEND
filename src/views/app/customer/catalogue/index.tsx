import { Container, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { Input, Pagination, Select } from '@/components/ui';
import useCategoryProduct from '@/utils/hooks/products/useCategoryCustomer';
import ProductCategoryListContent from './components/CategoryList';
import { injectReducer, useAppDispatch } from '@/store';
import { apiGetProductCategories } from '@/services/ProductCategoryServices';
import reducer, { getProductCategories, useAppSelector } from './store';

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
const Categories = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [searchTerm, setSearchTerm] = useState('');
  const dispatch = useAppDispatch();
  const { total, productCategories, loading } = useAppSelector(
    (state) => state.catalogue.data
  );

  useEffect(() => {
    fetchProductCategories();
  }, [currentPage, pageSize, searchTerm]);

  const fetchProductCategories = async () => {
    dispatch(getProductCategories({pagination: {page: currentPage, pageSize}, searchTerm}))
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const onPageSelect = ({ value }: Option) => {
    setPageSize(value);
  };

  return (
    <Container>
      <HeaderTitle
        title="Catégorie de produit"
        buttonTitle="Ajouter une catégorie de produit"
        description="Catégorie de produit"
        link={''}
        addAction={false}
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder="Rechercher une catégorie de produit"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Loading loading={loading}>
          <ProductCategoryListContent productCategories={productCategories} />
        </Loading>
        <div className="flex justify-end mt-10">
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
      </div>
    </Container>
  );
};

export default Categories;
