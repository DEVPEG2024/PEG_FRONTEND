import Button from '@/components/ui/Button';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { HiPencil, HiPrinter, HiTrash } from 'react-icons/hi';
import { Project } from '@/@types/project';
import DetailsRight from './detailsRight';
import { IUser } from '@/@types/user';
import { useAppDispatch } from '@/store';
import {
  deleteInvoice,
  getInvoicesProject,
  setEditInvoiceDialog,
  setNewInvoiceDialog,
  setSelectedInvoice,
  useAppSelector,
} from '../../store';
import { Card, Checkbox } from '@/components/ui';
import Empty from '@/components/shared/Empty';
import { GoTasklist } from 'react-icons/go';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Invoice } from '@/@types/invoice';
import ModalNewInvoice from '../../modals/newInvoice';
import ModalEditInvoice from '../../modals/editInvoice';
import ModalPrintInvoice from '../../modals/printInvoice';

// Nouveau type pour les commentaires
export interface IComment {
  _id: string;
  comment: string;
  user: IUser;
  createdAt: Date;
  startDate: Date;
  endDate: Date;
  file: string;
  fileType: string;
}
const Invoices = ({ project }: { project: Project }) => {
  const dispatch = useAppDispatch();
  const { invoices } = useAppSelector((state) => state.adminProjects.data);
  const [modalPrintInvoice, setModalPrintInvoice] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    dispatch(getInvoicesProject({ projectId: project.documentId })).finally(() =>
      setLoading(false)
    );
  }, [dispatch, project.documentId]);

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

  return (
    <Container className="h-full">
      <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AdaptableCard rightSideBorder bodyClass="p-5">
            <div className="flex justify-between items-center mb-4">
              <h4>Factures</h4>
              <Button
                variant="twoTone"
                size="sm"
                onClick={() => dispatch(setNewInvoiceDialog(true))}
              >
                Créer une facture
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {invoices.length > 0 ? (
                invoices.map((invoice: Invoice, index: number) => {
                  return (
                    <Card key={invoice._id} bordered className=" bg-gray-900">
                      <div className="grid grid-cols-12 justify-between">
                        <div className="col-span-6 ">
                          <div className="flex justify-between w-full">
                            <div className="flex items-center gap-2 ">
                              <span className="text-sm text-gray-500">
                                #{index + 1} -{' '}
                              </span>
                              <span className="font-semibold">
                                {invoice.invoiceNumber}
                              </span>
                            </div>
                            <div className="cursor-pointer  items-center justify-end gap-2 hidden md:block">
                              <span className="text-sm text-gray-500">
                                {dayjs(invoice.createdAt).format('DD/MM/YYYY')}
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
                            disabled={invoice.paymentStatus === 'paid'}
                            checked={invoice.paymentStatus === 'paid'}
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
                          <Button
                            variant="twoTone"
                            size="xs"
                            onClick={() => handleUpdateInvoice(invoice)}
                          >
                            <HiPencil size={15} />
                          </Button>
                          <Button
                            variant="twoTone"
                            size="xs"
                            onClick={() => handleDeleteInvoice(invoice._id)}
                          >
                            <HiTrash size={15} />
                          </Button>
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
        <DetailsRight project={project} />
      </div>
      <ModalNewInvoice project={project} />
      <ModalEditInvoice />
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
