import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './OrderItemColumns';
import { Input } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  getOrderItems,
  useAppSelector,
  updateOrderItem,
} from './store';

import { OrderItem } from '@/@types/orderItem';
import { useNavigate } from 'react-router-dom';

injectReducer('orders', reducer);

const OrderItemsList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { orderItems, total, loading } = useAppSelector(
    (state) => state.orders.data
  );

  useEffect(() => {
    dispatch(
      getOrderItems({
        pagination: {
          page: currentPage,
          pageSize: pageSize,
        },
        searchTerm: searchTerm,
      })
    );
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleShowOrderItem = (orderItem: OrderItem) => {
    navigate('/common/orderItem/' + orderItem.documentId);
  };

  const handleFinishOrder = async (orderItem: OrderItem) => {
    const orderItemUpdate: Partial<OrderItem> = {
      documentId: orderItem.documentId,
      state: 'fulfilled',
    };
    await dispatch(updateOrderItem(orderItemUpdate)).unwrap();
    //dispatch(getOrder({ orderId: order.documentId }));
  };

  const handlePendOrder = async (orderItem: OrderItem) => {
    const orderItemUpdate: Partial<OrderItem> = {
      documentId: orderItem.documentId,
      state: 'pending',
    };
    await dispatch(updateOrderItem(orderItemUpdate)).unwrap();
    //dispatch(getOrder({ orderId: order.documentId }));
  };

  const columns = useColumns(
    handleShowOrderItem,
    handleFinishOrder,
    handlePendOrder
  );
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
        title="Commandes"
        buttonTitle=""
        description="Gérer les commandes"
        total={total}
        link=""
        addAction={false}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={'Rechercher une commande'}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Loading loading={loading}>
          <DataTable
            columns={columns}
            data={orderItems}
            onPaginationChange={onPaginationChange}
            onSelectChange={onSelectChange}
            pagingData={{
              total: total,
              pageIndex: currentPage,
              pageSize: pageSize,
            }}
          />
        </Loading>
      </div>
    </Container>
  );
};

export default OrderItemsList;
