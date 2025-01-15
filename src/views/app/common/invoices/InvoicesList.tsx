import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { InvoicesListColumns } from './InvoicesListColumns';
import { Input } from '@/components/ui';
import { Invoice } from '@/@types/invoice';
import {
  injectReducer,
  useAppDispatch,
  useAppSelector as useRootAppSelector,
  RootState,
} from '@/store';
import reducer, {
  getInvoices,
  setEditInvoiceDialog,
  setPrintInvoiceDialog,
  setSelectedInvoice,
  updateInvoice,
  useAppSelector,
} from './store';
import ModalEditInvoice from './modals/ModalEditInvoice';
import ModalPrintInvoice from './modals/ModalPrintInvoice';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';

injectReducer('invoices', reducer);

const InvoicesList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const isAdminOrSuperAdmin: boolean = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const {
    invoices,
    total,
    loading,
    selectedInvoice,
    editInvoiceDialog,
    printInvoiceDialog,
  } = useAppSelector((state) => state.invoices.data);

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, pageSize, searchTerm]);

  const fetchInvoices = async () => {
    dispatch(
      getInvoices({
        request: { pagination: { page: currentPage, pageSize }, searchTerm },
        user,
      })
    );
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCancelInvoice = (invoice: Invoice) => {
    dispatch(
      updateInvoice({ documentId: invoice.documentId, state: 'canceled' })
    );
  };

  const handleUpdateInvoice = (invoice: Invoice) => {
    dispatch(setSelectedInvoice(invoice));
    dispatch(setEditInvoiceDialog(true));
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    dispatch(setSelectedInvoice(invoice));
    dispatch(setPrintInvoiceDialog(true));
  };

  const columns = InvoicesListColumns(
    handleUpdateInvoice,
    handleCancelInvoice,
    handlePrintInvoice,
    isAdminOrSuperAdmin
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
      {isAdminOrSuperAdmin && selectedInvoice && editInvoiceDialog && (
        <ModalEditInvoice
          editInvoiceDialog={editInvoiceDialog}
          selectedInvoice={selectedInvoice}
          setEditInvoiceDialog={setEditInvoiceDialog}
          setSelectedInvoice={setSelectedInvoice}
          updateInvoice={updateInvoice}
          dispatch={dispatch}
          loading={loading}
        />
      )}
      {selectedInvoice && printInvoiceDialog && (
        <ModalPrintInvoice
          printInvoiceDialog={printInvoiceDialog}
          selectedInvoice={selectedInvoice}
          setPrintInvoiceDialog={setPrintInvoiceDialog}
          setSelectedInvoice={setSelectedInvoice}
          dispatch={dispatch}
        />
      )}
    </Container>
  );
};

export default InvoicesList;
