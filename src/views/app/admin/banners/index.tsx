import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './columns';
import { Input } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteBanner,
  getBanners,
  setEditBannerDialog,
  setNewBannerDialog,
  setSelectedBanner,
  useAppSelector,
} from './store';
import ModalNewBanner from './modals/newBanner';

import { useNavigate } from 'react-router-dom';
import { IBanner } from '@/@types/banner';
import ModalEditBanner from './modals/editBanner';

injectReducer('banners', reducer);

const Banners = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { banners, total } = useAppSelector((state) => state.banners.data);

  useEffect(() => {
    dispatch(
      getBanners({
        page: currentPage,
        pageSize: pageSize,
        searchTerm: searchTerm,
      })
    );
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteBanner = (bannerId: string) => {
    dispatch(deleteBanner({ bannerId }));
  };

  const handleUpdateBanner = (banner: IBanner) => {
    dispatch(setSelectedBanner(banner));
    dispatch(setEditBannerDialog(true));
  };

  const addBanner = () => {
    dispatch(setNewBannerDialog(true));
  };

  const columns = useColumns(handleUpdateBanner, handleDeleteBanner);
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
        title="Bannières"
        buttonTitle="Ajouter une bannière"
        description="Gérer les bannières"
        link={'/admin/banners/add'}
        addAction={true}
        action={addBanner}
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={'Rechercher une bannière'}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          data={banners}
          onPaginationChange={onPaginationChange}
          onSelectChange={onSelectChange}
          pagingData={{
            total: total,
            pageIndex: currentPage,
            pageSize: pageSize,
          }}
        />
      </div>
      <ModalNewBanner />
      <ModalEditBanner />
    </Container>
  );
};

export default Banners;
