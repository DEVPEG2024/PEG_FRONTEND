import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './BannerColumns';
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
import ModalNewBanner from './modals/ModalNewBanner';

import { Banner } from '@/@types/banner';
import ModalEditBanner from './modals/ModalEditBanner';

injectReducer('banners', reducer);

const BannersList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { banners, total, selectedBanner, newBannerDialog, editBannerDialog } = useAppSelector((state) => state.banners.data);

  useEffect(() => {
    dispatch(getBanners({ pagination: {page: currentPage, pageSize}, searchTerm }));
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteBanner = (banner: Banner) => {
    dispatch(deleteBanner(banner.documentId));
  };

  const handleUpdateBanner = (banner: Banner) => {
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
      {newBannerDialog && <ModalNewBanner />}
      {editBannerDialog && selectedBanner && <ModalEditBanner />}
    </Container>
  );
};

export default BannersList;
