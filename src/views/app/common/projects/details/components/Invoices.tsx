import Button from '@/components/ui/Button';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { HiBan, HiPencil, HiPrinter } from 'react-icons/hi';
import DetailsRight from './DetailsRight';
import { User } from '@/@types/user';
import { RootState, useAppDispatch } from '@/store';
import {
  addInvoice,
  setEditProjectInvoiceDialog,
  setPrintProjectInvoiceDialog,
  setSelectedProjectInvoice,
  updateProjectInvoice,
  useAppSelector,
} from '../store';
import { Card, Checkbox, Notification, toast } from '@/components/ui';
import Empty from '@/components/shared/Empty';
import { GoTasklist } from 'react-icons/go';
import dayjs from 'dayjs';
import { Invoice } from '@/@types/invoice';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import ModalEditInvoice from '@/views/app/common/invoices/modals/ModalEditInvoice';
import ModalPrintInvoice from '@/views/app/common/invoices/modals/ModalPrintInvoice';
import { stateData } from '@/views/app/common/invoices/constants';
import createUID from '@/components/ui/utils/createUid';

const Invoices = () => {
  const { user }: { user: User } = useAppSelector(
    (state: RootState) => state.auth.user
  );
  const dispatch = useAppDispatch();
  const {
    invoices,
    editProjectInvoiceDialog: editInvoiceDialog,
    selectedProjectInvoice: selectedInvoice,
    printProjectInvoiceDialog: printInvoiceDialog,
    project,
    loading,
  } = useAppSelector((state) => state.projectDetails.data);

  const handleCancelInvoice = (invoice: Invoice) => {
    dispatch(
      updateProjectInvoice({
        documentId: invoice.documentId,
        state: 'canceled',
      })
    );
  };

  const handleUpdateInvoice = (invoice: Invoice) => {
    dispatch(setSelectedProjectInvoice(invoice));
    dispatch(setEditProjectInvoiceDialog(true));
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    dispatch(setSelectedProjectInvoice(invoice));
    dispatch(setPrintProjectInvoiceDialog(true));
  };

  const generateInvoice = () : void => {
    const errorsOnGeneration: string[] = verifyGeneration()
    if (errorsOnGeneration.length > 0) {
      toast.push(
        <Notification type="danger" title="Erreur à la création de la facture">
          {errorsOnGeneration.map((errorOnGeneration) => (
            <div>{errorOnGeneration}</div>
          ))}
        </Notification>
      );
      
    } else {
      const invoice: Omit<Invoice, 'documentId'> = {
        customer: project.customer,
        orderItems: [],
        amount: project.price,
        vatAmount: project.price * 0.2,
        totalAmount: project.price * 1.2,
        name: createUID(10).toUpperCase(),
        date: dayjs().toDate(),
        dueDate: dayjs().add(30, 'day').toDate(),
        state: 'pending',
        paymentMethod: 'transfer',
        paymentAmount: 0,
        paymentReference: '',
        paymentState: 'pending',
        paymentDate: new Date(0),
      };
      dispatch(addInvoice({invoice, project}));
    }
  }

  const verifyGeneration = () : string[] => {
    const errors : string[] = []
    if (!project.customer) {
      errors.push("Aucun client renseigné sur le projet")
    }
    if (!project.price || project.price === 0) {
      errors.push("Le montant du projet est nul")
    }
    return errors
  }

  return (
    <Container className="h-full">
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdaptableCard rightSideBorder bodyClass="p-5">
            <div className="flex justify-between items-center mb-4">
              <h4>Factures</h4>
            </div>
            {hasRole(user, [SUPER_ADMIN, ADMIN]) && (<Button loading={loading} onClick={generateInvoice} className="mb-4">Générer la facture du projet</Button>)}
            <div className="flex flex-col gap-2">
              {invoices.length > 0 ? (
                invoices.map((invoice: Invoice, index: number) => {
                  return (
                    <Card
                      key={invoice.documentId}
                      bordered
                      className=" bg-gray-900"
                    >
                      <div className="grid grid-cols-12 justify-between">
                        <div className="col-span-6 ">
                          <div className="flex justify-between w-full">
                            <div className="flex items-center gap-2 ">
                              <span className="text-sm text-gray-500">
                                #{index + 1} -{' '}
                              </span>
                              <span className="font-semibold">
                                {invoice.name}
                              </span>
                            </div>
                            <div className="gap-2 hidden md:block">
                              <span className="text-sm text-gray-500">
                                {stateData.find(
                                  ({ value }) => value === invoice.state
                                )?.label ?? 'Statut indéterminé'}
                              </span>
                            </div>
                            <div className="gap-2 hidden md:block">
                              <span className="text-sm text-gray-500">
                                {dayjs(invoice.date).format('DD/MM/YYYY')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 col-span-6">
                          <span className="font-semibold hidden md:block">
                            {invoice.totalAmount.toFixed(2)} €
                          </span>
                          <Checkbox
                            className="col-span-6"
                            disabled={invoice.paymentState === 'fulfilled'}
                            checked={invoice.paymentState === 'fulfilled'}
                            color="green-500"
                          />
                          <Button
                            variant="twoTone"
                            size="xs"
                            color="blue"
                            onClick={() => handlePrintInvoice(invoice)}
                          >
                            <HiPrinter size={15} />
                          </Button>
                          {hasRole(user, [SUPER_ADMIN]) && (
                            <Button
                              variant="twoTone"
                              size="xs"
                              onClick={() => handleUpdateInvoice(invoice)}
                            >
                              <HiPencil size={15} />
                            </Button>
                          )}
                          {hasRole(user, [SUPER_ADMIN]) && (
                            <Button
                              variant="twoTone"
                              size="xs"
                              onClick={() => handleCancelInvoice(invoice)}
                              disabled={invoice?.state === 'canceled'}
                            >
                              <HiBan size={15} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="flex flex-col gap-2 justify-center items-center">
                  <Empty icon={<GoTasklist size={150} />}>
                    <p>Aucune facture trouvée</p>
                  </Empty>
                </div>
              )}
            </div>
          </AdaptableCard>
        </div>
        <DetailsRight />
      </div>
      {selectedInvoice && editInvoiceDialog && hasRole(user, [SUPER_ADMIN]) && (
        <ModalEditInvoice
          editInvoiceDialog={editInvoiceDialog}
          selectedInvoice={selectedInvoice}
          setEditInvoiceDialog={setEditProjectInvoiceDialog}
          setSelectedInvoice={setSelectedProjectInvoice}
          updateInvoice={updateProjectInvoice}
          dispatch={dispatch}
          loading={loading}
        />
      )}
      {selectedInvoice && printInvoiceDialog && (
        <ModalPrintInvoice
          printInvoiceDialog={printInvoiceDialog}
          selectedInvoice={selectedInvoice}
          setPrintInvoiceDialog={setPrintProjectInvoiceDialog}
          setSelectedInvoice={setSelectedProjectInvoice}
          dispatch={dispatch}
        />
      )}
    </Container>
  );
};

export default Invoices;
