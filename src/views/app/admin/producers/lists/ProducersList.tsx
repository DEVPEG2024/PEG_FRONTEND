import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './ProducerColumns';
import { Input } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { PRODUCERS_NEW } from '@/constants/navigation.constant';
import { useNavigate } from 'react-router-dom';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { getProducers, useAppSelector } from '../store';
import { Producer } from '@/@types/producer';

injectReducer('producers', reducer);

const ProducersList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const dispatch = useAppDispatch();
  const { total, producers, loading } = useAppSelector(
    (state) => state.producers.data
  );

  useEffect(() => {
    fetchProducers();
  }, [currentPage, pageSize, searchTerm]);

  const fetchProducers = async () => {
    dispatch(
      getProducers({ pagination: { page: currentPage, pageSize }, searchTerm })
    );
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEditProducer = (producer: Producer) => {
    navigate(`/admin/producers/edit/${producer.documentId}`, {
      state: { producerData: producer },
    });
  };

  const columns = useColumns(handleEditProducer);
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
        title="p.producers"
        buttonTitle="p.add"
        description="p.description"
        link={PRODUCERS_NEW}
        addAction
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={t('p.search')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Loading loading={loading}>
          <DataTable
            columns={columns}
            data={producers}
            onPaginationChange={onPaginationChange}
            onSelectChange={onSelectChange}
            pagingData={{
              total,
              pageIndex: currentPage,
              pageSize: pageSize,
            }}
          />
        </Loading>
      </div>
    </Container>
  );
};

export default ProducersList;
