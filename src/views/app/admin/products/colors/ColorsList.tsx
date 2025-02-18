import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteColor,
  getColors,
  setEditColorDialog,
  setNewColorDialog,
  setSelectedColor,
  useAppSelector,
} from './store';

import ModalEditColor from './modals/ModalEditColor';
import { Color } from '@/@types/product';
import { useColumns } from './ColorColumns';
import ModalNewColor from './modals/ModalNewColor';

injectReducer('colors', reducer);

const ColorsList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { colors, total, selectedColor, newColorDialog, editColorDialog } =
    useAppSelector((state) => state.colors.data);

  useEffect(() => {
    dispatch(
      getColors({ pagination: { page: currentPage, pageSize }, searchTerm })
    );
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteColor = (color: Color) => {
    dispatch(deleteColor(color.documentId));
  };

  const handleUpdateColor = (color: Color) => {
    dispatch(setSelectedColor(color));
    dispatch(setEditColorDialog(true));
  };

  const addColor = () => {
    dispatch(setNewColorDialog(true));
  };

  const columns = useColumns(handleUpdateColor, handleDeleteColor);
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
        title="Couleurs"
        buttonTitle="Ajouter une couleur"
        description="Gérer les couleurs"
        link={'/admin/colors/add'}
        addAction={true}
        action={addColor}
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={'Rechercher une couleur'}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          data={colors}
          onPaginationChange={onPaginationChange}
          onSelectChange={onSelectChange}
          pagingData={{
            total: total,
            pageIndex: currentPage,
            pageSize: pageSize,
          }}
        />
      </div>
      {newColorDialog && <ModalNewColor />}
      {editColorDialog && selectedColor && <ModalEditColor />}
    </Container>
  );
};

export default ColorsList;
