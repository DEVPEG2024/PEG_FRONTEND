import { Container, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { Input, Pagination, Select } from '@/components/ui';
import ProductCategoriesListContent from './components/ProductCategoriesListContent';
import ModalEditProductCategory from './modals/ModalEditProductCategory';
import ModalDeleteProductCategory from './modals/ModalDeleteProductCategory';
import reducer, {
  getProductCategories,
  setProductCategory,
  useAppDispatch,
  useAppSelector,
} from './store';
import { injectReducer } from '@/store';
import { ProductCategory } from '@/@types/product';
import { useTranslation } from 'react-i18next';

injectReducer('productCategories', reducer);

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
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState<boolean>(false);
  const { productCategories, productCategory, loading, total } = useAppSelector(
    (state) => state.productCategories.data
  );

  useEffect(() => {
    dispatch(
      getProductCategories({
        pagination: { page: currentPage, pageSize },
        searchTerm,
      })
    );
  }, [dispatch, searchTerm, currentPage, pageSize]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEditProductCategory = (productCategory: ProductCategory) => {
    dispatch(setProductCategory(productCategory));
    setIsOpenEdit(true);
  };

  const handleDeleteProductCategory = async (
    productCategory: ProductCategory
  ) => {
    dispatch(setProductCategory(productCategory));
    setIsOpenDelete(true);
  };

  const onPageSelect = ({ value }: Option) => {
    setPageSize(value);
  };

  const setIsOpenNewCategoryProduct = () => {
    setIsOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsOpen(false);
    setIsOpenEdit(false);
    setIsOpenDelete(false);
    dispatch(setProductCategory(undefined));
  };

  return (
    <Container>
      <HeaderTitle
        title="Catégorie de produit"
        buttonTitle="Ajouter une catégorie de produit"
        description="Catégorie de produit"
        link={''}
        addAction={true}
        action={setIsOpenNewCategoryProduct}
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
          <ProductCategoriesListContent
            productCategories={productCategories}
            handleEditProductCategory={handleEditProductCategory}
            handleDeleteProductCategory={handleDeleteProductCategory}
          />
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
      {isOpen && (
        <ModalEditProductCategory
          mode="add"
          title={t('cat.addCategory')}
          isOpen={isOpen}
          handleCloseModal={handleCloseModal}
        />
      )}
      {productCategory && isOpenEdit && (
        <ModalEditProductCategory
          mode="edit"
          title={t('cat.editCategory')}
          isOpen={isOpenEdit}
          handleCloseModal={handleCloseModal}
        />
      )}
      {productCategory && isOpenDelete && (
        <ModalDeleteProductCategory
          title="Supprimer une catégorie de produit"
          isOpen={isOpenDelete}
          handleCloseModal={handleCloseModal}
        />
      )}
    </Container>
  );
};

export default Categories;
