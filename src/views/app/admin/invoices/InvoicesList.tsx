import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { InvoicesListColumns } from './InvoicesListColumns';
import { Input } from '@/components/ui';
import { Invoice } from '@/@types/invoice';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteInvoice,
  getInvoices,
  setEditInvoiceDialog,
  setNewInvoiceDialog,
  setPrintInvoiceDialog,
  setSelectedInvoice,
  useAppSelector,
} from './store';
import ModalEditInvoice from './modals/ModalEditInvoice';
import ModalPrintInvoice from './modals/ModalPrintInvoice';

injectReducer('invoices', reducer);

const InvoicesList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { invoices, total, loading, selectedInvoice, editInvoiceDialog, printInvoiceDialog } = useAppSelector((state) => state.invoices.data);

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, pageSize, searchTerm]);

  const fetchInvoices = async () => {
    dispatch(getInvoices({pagination: {page: currentPage, pageSize}, searchTerm}))
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    dispatch(deleteInvoice(invoice.documentId));
  };

  const handleUpdateInvoice = (invoice: Invoice) => {
    dispatch(setSelectedInvoice(invoice));
    dispatch(setEditInvoiceDialog(true));
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    dispatch(setSelectedInvoice(invoice));
    dispatch(setPrintInvoiceDialog(true));
  };

  /*const addInvoice = () => {
    dispatch(setNewInvoiceDialog(true));
  };*/

  const columns = InvoicesListColumns(
    handleUpdateInvoice,
    handleDeleteInvoice,
    handlePrintInvoice
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
        title="Factures"
        description="Gérer les factures"
        total={total}
        buttonTitle=""
        link=""
        addAction={false}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={'Rechercher une facture'}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Loading loading={loading}>
          <DataTable
            columns={columns}
            data={invoices}
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
      {/*newInvoiceDialog && <ModalNewInvoice />*/}
      {selectedInvoice && editInvoiceDialog && <ModalEditInvoice />}
      {selectedInvoice && printInvoiceDialog && <ModalPrintInvoice />}
    </Container>
  );
};

export default InvoicesList;
