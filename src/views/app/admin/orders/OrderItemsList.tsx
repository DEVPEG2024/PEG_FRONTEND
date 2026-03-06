import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './OrderItemColumns';
import { Input } from '@/components/ui';
import { injectReducer, useAppDispatch, RootState } from '@/store';
import reducer, {
  getOrderItems,
  useAppSelector,
  updateOrderItem,
  deleteOrderItem,
} from './store';

import { OrderItem } from '@/@types/orderItem';
import { useNavigate } from 'react-router-dom';
import { User } from '@/@types/user';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetProductForShowById } from '@/services/ProductServices';
import { apiCreateProject } from '@/services/ProjectServices';
import { apiUpdateOrderItem } from '@/services/OrderItemServices';
import { ChecklistItem } from '@/@types/checklist';
import { Project } from '@/@types/project';

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
  const { user }: { user: User } = useAppSelector(
    (state: RootState) => state.auth.user
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

  const handleShowProject = async (orderItem: OrderItem) => {
    navigate(`/common/projects/details/${orderItem.project.documentId}`);
  };

  const handleCreateProject = async (orderItem: OrderItem) => {
    const { product } = await unwrapData(
      apiGetProductForShowById(orderItem.product.documentId)
    );
    const checklistItems: ChecklistItem[] =
      product?.checklist?.items?.map((label: string) => ({ label, done: false })) ?? [];
    const { createProject }: { createProject: Project } = await unwrapData(
      apiCreateProject({
        name: `Projet - ${orderItem.product.name}`,
        description: '',
        startDate: new Date(),
        endDate: new Date(),
        state: 'pending',
        customer: orderItem.customer,
        producer: null,
        priority: 'low',
        price: orderItem.price,
        producerPrice: 0,
        paidPrice: 0,
        producerPaidPrice: 0,
        comments: [],
        images: [],
        tasks: [],
        invoices: [],
        poolable: false,
        orderItem: orderItem,
        checklistItems,
      })
    );
    await apiUpdateOrderItem({
      documentId: orderItem.documentId,
      project: { documentId: createProject.documentId } as any,
    });
    dispatch(
      getOrderItems({
        pagination: { page: currentPage, pageSize },
        searchTerm,
      })
    );
    navigate(`/common/projects/details/${createProject.documentId}`);
  };

  const handleDeleteOrderItem = (orderItem: OrderItem) => {
    dispatch(deleteOrderItem(orderItem.documentId));
  };

  const columns = useColumns(
    handleShowOrderItem,
    handleFinishOrder,
    handlePendOrder,
    handleShowProject,
    handleCreateProject,
    handleDeleteOrderItem,
    user
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
