import Button from '@/components/ui/Button';
import AdaptableCard from '@/components/shared/AdaptableCard';
import Container from '@/components/shared/Container';
import { HiPencil, HiPrinter, HiTrash } from 'react-icons/hi';
import { Project } from '@/@types/project';
import DetailsRight from './DetailsRight';
import { User } from '@/@types/user';
import { RootState, useAppDispatch } from '@/store';
import {
  deleteInvoice,
  setEditInvoiceDialog,
  setNewInvoiceDialog,
  setSelectedInvoice,
  useAppSelector,
} from '../store';
import { Card, Checkbox } from '@/components/ui';
import Empty from '@/components/shared/Empty';
import { GoTasklist } from 'react-icons/go';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Invoice, InvoiceOld } from '@/@types/invoice';

import ModalPrintInvoice from '../../modals/ModalPrintInvoice';
import { hasRole } from '@/utils/permissions';
import { SUPER_ADMIN } from '@/constants/roles.constant';
import ModalEditInvoice from '@/views/app/admin/invoices/modals/ModalEditInvoice';

// TODO SUITE:  édition print -> utiliser les Modal de admin/invoices mais voir pour la utualisation car store spécifique
const Invoices = () => {
  const {user}: {user: User} = useAppSelector((state: RootState) => state.auth.user);
  const dispatch = useAppDispatch();
  const { invoices } = useAppSelector((state) => state.projectDetails.data);
  const [modalPrintInvoice, setModalPrintInvoice] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const handleDeleteInvoice = (invoice: Invoice) => {
    dispatch(deleteInvoice(invoice.documentId));
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
              {/*hasRole(user, [SUPER_ADMIN]) && (
                <Button
                  variant="twoTone"
                  size="sm"
                  onClick={() => dispatch(setNewInvoiceDialog(true))}
                >
                  Créer une facture
                </Button>
              )*/}
            </div>
            <div className="flex flex-col gap-2">
              {invoices.length > 0 ? (
                invoices.map((invoice: Invoice, index: number) => {
                  return (
                    <Card key={invoice.documentId} bordered className=" bg-gray-900">
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
                            <div className="cursor-pointer  items-center justify-end gap-2 hidden md:block">
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
                            onClick={() => handleDeleteInvoice(invoice)}
                          >
                            <HiTrash size={15} />
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
      {/*{hasRole(user, [SUPER_ADMIN]) && (
        <ModalNewInvoice />
      )}*/}
      {hasRole(user, [SUPER_ADMIN]) && (
        <ModalEditInvoice />
      )}
      {invoice && (
        <ModalPrintInvoice
          invoice={invoice as InvoiceOld}
          isOpen={modalPrintInvoice}
          onClose={() => setModalPrintInvoice(false)}
        />
      )}
    </Container>
  );
};

export default Invoices;
