import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './CustomerColumns';
import { Input } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { CUSTOMERS_NEW } from '@/constants/navigation.constant';
import { useNavigate } from 'react-router-dom';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { getCustomers, useAppSelector } from '../store';
import { Customer } from '@/@types/customer';

injectReducer('customers', reducer);

const CustomersList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const dispatch = useAppDispatch();
  const { total, customers, loading } = useAppSelector(
    (state) => state.customers.data
  );

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize, searchTerm]);

  const fetchCustomers = async () => {
    dispatch(
      getCustomers({ pagination: { page: currentPage, pageSize }, searchTerm })
    );
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEditCustomer = (customer: Customer) => {
    navigate(`/admin/customers/edit/${customer.documentId}`, {
      state: { customerData: customer },
    });
  };

  const columns = useColumns(handleEditCustomer);
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
        title="cust.customers"
        buttonTitle="cust.add"
        description="cust.description"
        link={CUSTOMERS_NEW}
        addAction
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={t('cust.search')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Loading loading={loading}>
          <DataTable
            columns={columns}
            data={customers}
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

export default CustomersList;
