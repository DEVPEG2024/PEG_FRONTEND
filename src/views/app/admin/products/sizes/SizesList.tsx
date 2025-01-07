import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteSize,
  getSizes,
  setEditSizeDialog,
  setNewSizeDialog,
  setSelectedSize,
  useAppSelector,
} from './store';

import ModalEditSize from './modals/ModalEditSize';
import { Size } from '@/@types/product';
import { useColumns } from './SizeColumns';
import ModalNewSize from './modals/ModalNewSize';

injectReducer('sizes', reducer);

const SizesList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { sizes, total, selectedSize, newSizeDialog, editSizeDialog } = useAppSelector((state) => state.sizes.data);

  useEffect(() => {
    dispatch(getSizes({ pagination: {page: currentPage, pageSize}, searchTerm }));
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteSize = (size: Size) => {
    dispatch(deleteSize(size.documentId));
  };

  const handleUpdateSize = (size: Size) => {
    dispatch(setSelectedSize(size));
    dispatch(setEditSizeDialog(true));
  };

  const addSize = () => {
    dispatch(setNewSizeDialog(true));
  };

  const columns = useColumns(handleUpdateSize, handleDeleteSize);
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
        title="Tailles"
        buttonTitle="Ajouter une taille"
        description="Gérer les tailles"
        link={'/admin/sizes/add'}
        addAction={true}
        action={addSize}
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={'Rechercher une taille'}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          data={sizes}
          onPaginationChange={onPaginationChange}
          onSelectChange={onSelectChange}
          pagingData={{
            total: total,
            pageIndex: currentPage,
            pageSize: pageSize,
          }}
        />
      </div>
      {newSizeDialog && <ModalNewSize />}
      {editSizeDialog && selectedSize && <ModalEditSize />}
    </Container>
  );
};

export default SizesList;
