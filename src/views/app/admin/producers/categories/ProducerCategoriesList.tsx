import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './ProducerCategoryColumns';
import { Input } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import ModalDeleteProducerCategory from './modals/ModalDeleteProducerCategory';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  getProducerCategories,
  setProducerCategory,
  useAppSelector,
} from './store';
import { ProducerCategory } from '@/@types/producer';
import ModalEditProducerCategory from './modals/ModalEditProducerCategory';

injectReducer('producerCategories', reducer);

const ProducerCategoriesList = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOpenEdit, setIsOpenEdit] = useState<boolean>(false);
  const [isOpenDelete, setIsOpenDelete] = useState<boolean>(false);
  const { total, producerCategories, loading, producerCategory } =
    useAppSelector((state) => state.producerCategories.data);

  useEffect(() => {
    fetchProducerCategories();
  }, [currentPage, pageSize, searchTerm]);

  const handleAddCategory = () => {
    setIsOpen(true);
  };

  const handleEditCategory = (producerCateory: ProducerCategory) => {
    dispatch(setProducerCategory(producerCateory));
    setIsOpenEdit(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setIsOpenEdit(false);
    setIsOpenDelete(false);
    dispatch(setProducerCategory(undefined));
  };

  const handleDeleteCategory = (producerCateory: ProducerCategory) => {
    dispatch(setProducerCategory(producerCateory));
    setIsOpenDelete(true);
  };

  const fetchProducerCategories = async () => {
    dispatch(
      getProducerCategories({
        pagination: { page: currentPage, pageSize },
        searchTerm,
      })
    );
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
            data={producerCategories}
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
      {producerCategory && isOpenEdit && (
        <ModalEditProducerCategory
          mode="edit"
          title={t('cat.editCategory')}
          isOpen={isOpenEdit}
          handleCloseModal={handleCloseModal}
        />
      )}
      {isOpen && (
        <ModalEditProducerCategory
          mode="add"
          title={t('cat.addCategory')}
          isOpen={isOpen}
          handleCloseModal={handleCloseModal}
        />
      )}
      {producerCategory && isOpenDelete && (
        <ModalDeleteProducerCategory
          title={t('cat.deleteCategory')}
          isOpen={isOpenDelete}
          handleCloseModal={handleCloseModal}
        />
      )}
    </Container>
  );
};

export default ProducerCategoriesList;
