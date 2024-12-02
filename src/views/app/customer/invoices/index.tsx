import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './columns';
import { Input } from '@/components/ui';
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
import ModalPrintInvoice from './modals/printInvoice';
import { User } from '@/@types/user';

injectReducer('invoices', reducer);

const Invoices = () => {
  const dispatch = useAppDispatch();
  const {user}: {user: User} = useAppSelector((state) => state.auth.user);
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
        userId: user._id as string,
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

  const columns = useColumns(handlePrintInvoice);
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
        description="Consulter vos factures"
        link={'/customer/invoices/add'}
        addAction={false}
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
