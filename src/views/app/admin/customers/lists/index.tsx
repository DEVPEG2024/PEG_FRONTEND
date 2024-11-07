import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './columns';
import { Input } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { IUser } from '@/@types/user';
import useCustomer from '@/utils/hooks/customers/useCustomer';
import Empty from '@/components/shared/Empty';
import { CUSTOMERS_NEW } from '@/constants/navigation.constant';
import { useNavigate } from 'react-router-dom';

const Customers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const { getCustomers } = useCustomer();
  const [customers, setCustomers] = useState<IUser[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, pageSize, searchTerm]);

  const fetchCustomers = async () => {
    const result = await getCustomers(currentPage, pageSize, searchTerm);
    setCustomers(result.data || []);
    setTotalItems(result.total || 0);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEditCustomer = (customer: IUser) => {
    navigate(`/admin/customers/edit/${customer._id}`, {
      state: { customerData: customer },
    });
  };

  const columns = useColumns(fetchCustomers, handleEditCustomer);
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
        total={totalItems}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={t('cust.search')}
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
    </Container>
  );
};

export default Customers;
