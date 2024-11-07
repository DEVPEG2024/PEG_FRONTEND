import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './columns';
import { Input } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import useCategoryCustomer from '@/utils/hooks/customers/useCategoryCustomer';
import { ICategoryCustomer } from '@/services/CustomerServices';
import ModalAddCategory from './modals/form';
import ModalDeleteCategory from './modals/delete';
import Empty from '@/components/shared/Empty';

const Categories = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [category, setCategory] = useState<ICategoryCustomer | null>(null);
  const { getCategoriesCustomers } = useCategoryCustomer();
  const [customers, setCustomers] = useState<ICategoryCustomer[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize, searchTerm]);

  const handleAddCategory = () => {
    setCategory(null);
    setIsOpen(true);
  };

  const handleEditCategory = (customer: ICategoryCustomer) => {
    setCategory(customer);
    setIsOpenEdit(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setIsOpenEdit(false);
    setIsOpenDelete(false);
    setCategory(null);
  };

  const handleDeleteCategory = (category: ICategoryCustomer) => {
    setCategory(category);
    setIsOpenDelete(true);
  };

  const fetchCustomers = async () => {
    const result = await getCategoriesCustomers(
      currentPage,
      pageSize,
      searchTerm
    );
    setCustomers(result.data || []);
    setTotalItems(result.total || 0);
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
        total={totalItems}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={t('cat.search')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <DataTable
          columns={columns}
          data={customers}
          onPaginationChange={onPaginationChange}
          onSelectChange={onSelectChange}
          pagingData={{
            total: totalItems,
            pageIndex: currentPage,
            pageSize: pageSize,
          }}
        />
      </div>
      {category && (
        <ModalAddCategory
          mode="edit"
          title={t('cat.editCategory')}
          isOpen={isOpenEdit}
          handleCloseModal={handleCloseModal}
          setIsOpen={setIsOpenEdit}
          fetchCategories={fetchCustomers}
          category={category}
        />
      )}
      <ModalAddCategory
        mode="add"
        title={t('cat.addCategory')}
        isOpen={isOpen}
        handleCloseModal={handleCloseModal}
        setIsOpen={setIsOpen}
        fetchCategories={fetchCustomers}
        category={null}
      />
      {category && (
        <ModalDeleteCategory
          title={t('cat.deleteCategory')}
          isOpen={isOpenDelete}
          handleCloseModal={handleCloseModal}
          setIsOpen={setIsOpenDelete}
          fetchCategories={fetchCustomers}
          category={category}
        />
      )}
    </Container>
  );
};

export default Categories;
