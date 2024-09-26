import { Container, DataTable } from "@/components/shared";
import HeaderTitle from "@/components/template/HeaderTitle";
import { useEffect, useState } from "react";
import { useColumns } from "./columns";
import { Input } from "@/components/ui";
import { injectReducer, useAppDispatch } from "@/store";
import reducer, {
  deleteTicket,
  getTickets,
  setEditTicketDialog,
  setNewTicketDialog,
  setSelectedTicket,
  useAppSelector,
} from "./store";
import ModalNewTicket from "./modals/newTicket";

import { ITicket } from "@/@types/ticket";
import { useNavigate } from "react-router-dom";
import ModalEditTicket from "./modals/editTicket";

injectReducer("tickets", reducer);

const Tickets = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const { tickets, total } = useAppSelector((state) => state.tickets.data);

  useEffect(() => {
    dispatch(
      getTickets({
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

  const handleDeleteTicket = (ticketId: string) => {
    dispatch(deleteTicket({ ticketId }));
  };

  const handleUpdateTicket = (ticket: ITicket) => {
    dispatch(setSelectedTicket(ticket));
    dispatch(setEditTicketDialog(true));
  };



  const addTicket = () => {
    dispatch(setNewTicketDialog(true));
  };

  const handleViewTicket = (ticket: ITicket) => {
    dispatch(setSelectedTicket(ticket));
    navigate(`/support/details/${ticket._id}`);
  };

  const columns = useColumns(
    handleUpdateTicket,
    handleDeleteTicket,
    handleViewTicket
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
        title="Tickets"
        buttonTitle="Ajouter un ticket"
        description="Gérer les tickets"
        link={"/support/add"}
        addAction={true}
        action={addTicket}
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={"Rechercher un ticket"}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          data={tickets}
          onPaginationChange={onPaginationChange}
          onSelectChange={onSelectChange}
          pagingData={{
            total: total,
            pageIndex: currentPage,
            pageSize: pageSize,
          }}
        />
      </div>
      <ModalNewTicket />
      <ModalEditTicket />
        
    </Container>
  );
};

export default Tickets;
