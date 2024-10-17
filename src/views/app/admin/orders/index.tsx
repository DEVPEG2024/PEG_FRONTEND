import { Container, DataTable } from "@/components/shared";
import HeaderTitle from "@/components/template/HeaderTitle";
import { useEffect, useState } from "react";
import { useColumns } from "./columns";
import { Input } from "@/components/ui";
import { injectReducer, useAppDispatch } from "@/store";
import reducer, {
  getOrders,
  finishOrder,
  useAppSelector,
  showCustomerProduct,
} from "./store";

import { IOrder } from "@/@types/order";
import { useNavigate } from "react-router-dom";

injectReducer("orders", reducer);

const Orders = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const { orders, total } = useAppSelector((state) => state.orders.data);

  useEffect(() => {
    dispatch(
      getOrders({
        page: currentPage,
        pageSize: pageSize,
        searchTerm: searchTerm,
      })
    )
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleShowProduct = (order: IOrder) => {
    dispatch(showCustomerProduct(order))
    navigate("/admin/product/" + order.product._id)
  };

  const handleUpdateStatusOrderFinished = (order: IOrder) => {
    dispatch(finishOrder({ order, status: 'Termine' }))
  };

  const columns = useColumns(
    handleShowProduct,
    handleUpdateStatusOrderFinished
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
            placeholder={"Rechercher une commande"}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          data={orders}
          onPaginationChange={onPaginationChange}
          onSelectChange={onSelectChange}
          pagingData={{
            total: total,
            pageIndex: currentPage,
            pageSize: pageSize,
          }}
        />
      </div>
    </Container>
  );
};

export default Orders;
