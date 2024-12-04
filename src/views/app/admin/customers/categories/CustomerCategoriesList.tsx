import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './columns';
import { Input } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import ModalEditCustomerCategory from './modals/ModalEditCustomerCategory';
import ModalDeleteCustomerCategory from './modals/ModalDeleteCustomerCategory';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { getCustomerCategories, setCustomerCategory, useAppSelector } from './store';
import { CustomerCategory } from '@/@types/customer';

injectReducer('customerCategories', reducer);

const CustomerCategoriesList = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOpenEdit, setIsOpenEdit] = useState<boolean>(false);
  const [isOpenDelete, setIsOpenDelete] = useState<boolean>(false);
  const { total, customerCategories, loading, customerCategory } = useAppSelector(
    (state) => state.customerCategories.data
  );

  useEffect(() => {
    fetchCustomerCategories();
  }, [currentPage, pageSize, searchTerm]);

  const handleAddCategory = () => {
    setIsOpen(true);
  };

  const handleEditCategory = (customerCateory: CustomerCategory) => {
    dispatch(setCustomerCategory(customerCateory));
    setIsOpenEdit(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setIsOpenEdit(false);
    setIsOpenDelete(false);
    dispatch(setCustomerCategory(undefined));
  };

  const handleDeleteCategory = (customerCateory: CustomerCategory) => {
    dispatch(setCustomerCategory(customerCateory));
    setIsOpenDelete(true);
  };

  const fetchCustomerCategories = async () => {
    dispatch(getCustomerCategories({pagination: {page: currentPage, pageSize}, searchTerm }));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const columns = useColumns(handleDeleteCategory, handleEditCategory);
  const onPaginationChange = (page: number) => {
    setCurrentPage(page);
  };

  const onSelectChange = (value = 10) => {
    setPageSize(Number(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };
  return (
    <Container>
      <HeaderTitle
        title="cat.categories"
        buttonTitle="cat.addCategory"
        description="cat.catDescription"
        link=""
        action={handleAddCategory}
        addAction
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={t('cat.search')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Loading loading={loading}>
          <DataTable
            columns={columns}
            data={customerCategories}
            onPaginationChange={onPaginationChange}
            onSelectChange={onSelectChange}
            pagingData={{
              total: total,
              pageIndex: currentPage,
              pageSize: pageSize,
            }}
          />
        </Loading>
      </div>
      {customerCategory && (
        <ModalEditCustomerCategory
          mode="edit"
          title={t('cat.editCategory')}
          isOpen={isOpenEdit}
          handleCloseModal={handleCloseModal}
        />
      )}
      <ModalEditCustomerCategory
        mode="add"
        title={t('cat.addCategory')}
        isOpen={isOpen}
        handleCloseModal={handleCloseModal}
      />
      {customerCategory && (
        <ModalDeleteCustomerCategory
          title={t('cat.deleteCategory')}
          isOpen={isOpenDelete}
          handleCloseModal={handleCloseModal}
        />
      )}
    </Container>
  );
};

export default CustomerCategoriesList;
