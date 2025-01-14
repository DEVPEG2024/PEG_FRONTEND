import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './TicketColumns';
import { Input } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteTicket,
  getTickets,
  setEditTicketDialog,
  setNewTicketDialog,
  setSelectedTicket,
  useAppSelector,
} from './store';
import ModalNewTicket from './modals/ModalNewTicket';

import { Ticket } from '@/@types/ticket';
import ModalEditTicket from './modals/ModalEditTicket';

injectReducer('tickets', reducer);

const TicketsList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { tickets, total, loading, newTicketDialog, editTicketDialog } =
    useAppSelector((state) => state.tickets.data);

  useEffect(() => {
    fetchTickets();
  }, [currentPage, pageSize, searchTerm]);

  const fetchTickets = async () => {
    dispatch(
      getTickets({ pagination: { page: currentPage, pageSize }, searchTerm })
    );
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteTicket = (ticket: Ticket) => {
    dispatch(deleteTicket(ticket.documentId));
  };

  const handleEditTicket = (ticket: Ticket) => {
    dispatch(setSelectedTicket(ticket));
    dispatch(setEditTicketDialog(true));
  };

  const addTicket = () => {
    dispatch(setNewTicketDialog(true));
  };

  const columns = useColumns(handleEditTicket, handleDeleteTicket);
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
        link={'/support/add'}
        addAction={true}
        action={addTicket}
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={'Rechercher un ticket'}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Loading loading={loading}>
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
        </Loading>
      </div>
      {newTicketDialog && <ModalNewTicket />}
      {editTicketDialog && <ModalEditTicket />}
    </Container>
  );
};

export default TicketsList;
