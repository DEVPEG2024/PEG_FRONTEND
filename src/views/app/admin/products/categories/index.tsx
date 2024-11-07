import { Container } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { Input, Pagination, Select } from '@/components/ui';
import useDeleteProject from '@/utils/hooks/projects/useDeleteProject';
import useCategoryProduct from '@/utils/hooks/products/useCategoryCustomer';
import ProductCategoryListContent from './components/CategoryList';
import ModalFormCategoryProduct from './modals/form';
import ModalDeleteCategory from './modals/delete';

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
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [categorySelected, setCategorySelected] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { getCategoriesProduct } = useCategoryProduct();

  useEffect(() => {
    fetchProjects();
  }, [currentPage, pageSize, searchTerm]);

  const fetchProjects = async () => {
    const resp = await getCategoriesProduct(currentPage, pageSize, searchTerm);
    setCategories(resp.data || []);
    setTotal(resp.total || 0);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteProject = async (id: string) => {
    setCategorySelected(id);
    setIsOpenDelete(true);
  };

  const onPageSelect = ({ value }: Option) => {
    setPageSize(value);
  };
  const setIsOpenNewCategoryProduct = () => {
    setIsOpen(true);
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
        <ProductCategoryListContent
          categories={categories}
          handleDeleteProject={handleDeleteProject}
        />
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
      <ModalFormCategoryProduct
        title="Ajouter une catégorie de produit"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fetchCategories={fetchProjects}
        category={null}
      />
      <ModalDeleteCategory
        title="Supprimer une catégorie de produit"
        isOpen={isOpenDelete}
        setIsOpen={setIsOpenDelete}
        fetchCategories={fetchProjects}
        category={categorySelected}
      />
    </Container>
  );
};

export default Categories;
