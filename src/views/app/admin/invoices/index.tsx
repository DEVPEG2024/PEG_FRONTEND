import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './columns';
import { Input } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { Invoice } from '@/@types/invoice';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteInvoice,
  getInvoices,
  setEditInvoiceDialog,
  setNewInvoiceDialog,
  setSelectedInvoice,
  useAppSelector,
} from './store';
import ModalNewInvoice from './modals/newInvoice';
import ModalEditInvoice from './modals/editInvoice';
import ModalPrintInvoice from './modals/printInvoice';

injectReducer('invoices', reducer);

const Invoices = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalPrintInvoice, setModalPrintInvoice] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const { invoices, total } = useAppSelector((state) => state.invoices.data);

  useEffect(() => {
    dispatch(
      getInvoices({
        page: currentPage,
        pageSize: pageSize,
        searchTerm: searchTerm,
      })
    );
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    dispatch(deleteInvoice({ invoiceId }));
  };

  const handleUpdateInvoice = (invoice: Invoice) => {
    dispatch(setSelectedInvoice(invoice));
    dispatch(setEditInvoiceDialog(true));
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setInvoice(invoice);
    setModalPrintInvoice(true);
  };

  const addInvoice = () => {
    dispatch(setNewInvoiceDialog(true));
  };

  const columns = useColumns(
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
        buttonTitle="Ajouter une facture"
        description="Gérer les factures"
        link={'/admin/invoices/add'}
        addAction={true}
        action={addInvoice}
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={'Rechercher une facture'}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

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
      </div>
      <ModalNewInvoice />
      <ModalEditInvoice invoice={invoice as Invoice} />
      {invoice && (
        <ModalPrintInvoice
          invoice={invoice as Invoice}
          isOpen={modalPrintInvoice}
          onClose={() => setModalPrintInvoice(false)}
        />
      )}
    </Container>
  );
};

export default Invoices;
