import {  Container, DataTable } from "@/components/shared";
import HeaderTitle from "@/components/template/HeaderTitle";
import { useEffect, useState } from "react";
import { useColumns } from "./columns";
import { Input } from "@/components/ui";
import { useTranslation } from "react-i18next";
import useCategoryCustomer from "@/utils/hooks/customers/useCategoryCustomer";
import { ICategoryCustomer } from "@/services/CustomerServices";
import ModalAddCategory from "./modals/form";
import ModalDeleteCategory from "./modals/delete";
import useCategoryProducer from "@/utils/hooks/producers/useCategoryProducer";
import { ICategoryProducer } from "@/services/ProducerServices";


const Categories = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenEdit, setIsOpenEdit] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [category, setCategory] = useState<ICategoryProducer | null>(null);
  const { getCategoriesProducers } = useCategoryProducer()
  const [categories, setCategories] = useState<ICategoryProducer[]>([])

  useEffect(() => {
    fetchCategories();
  }, [currentPage, pageSize, searchTerm]);

  const handleAddCategory = () => {
    setCategory(null);
    setIsOpen(true);
  }

  const handleEditCategory = (category: ICategoryProducer) => {
    setCategory(category);
    setIsOpenEdit(true);
  }

  const handleCloseModal = () => {
    setIsOpen(false);
    setIsOpenEdit(false);
    setIsOpenDelete(false);
    setCategory(null);
  }

  const handleDeleteCategory = (category: ICategoryProducer) => {
    setCategory(category);
    setIsOpenDelete(true);
  }

  const fetchCategories = async () => {
    const result = await getCategoriesProducers(currentPage, pageSize, searchTerm);
    setCategories(result.data || []);
    setTotalItems(result.total || 0);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };


  const columns = useColumns(handleDeleteCategory, handleEditCategory );
const onPaginationChange = (page: number) => {
  setCurrentPage(page);
}

const onSelectChange = (value = 10) => {
  setPageSize(Number(value));
  setCurrentPage(1); // Reset to first page when changing page size
}
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
            placeholder={t("cat.search")}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <DataTable
          columns={columns}
          data={categories}
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
          title={t("cat.editCategory")}
          isOpen={isOpenEdit}
          handleCloseModal={handleCloseModal}
          setIsOpen={setIsOpenEdit}
          fetchCategories={fetchCategories}
          category={category}
        />
      )}
      <ModalAddCategory
        mode="add"
        title={t("cat.addCategory")}
        isOpen={isOpen}
        handleCloseModal={handleCloseModal}
        setIsOpen={setIsOpen}
        fetchCategories={fetchCategories}
        category={null}
      />
      {category && (
        <ModalDeleteCategory
          title={t("cat.deleteCategory")}
          isOpen={isOpenDelete}
          handleCloseModal={handleCloseModal}
          setIsOpen={setIsOpenDelete}
          fetchCategories={fetchCategories}
          category={category}
        />
      )}
      

    </Container>
  );
}

export default Categories
