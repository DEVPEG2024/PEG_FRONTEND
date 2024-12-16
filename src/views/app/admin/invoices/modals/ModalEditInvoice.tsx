import {
  Button,
  DatePicker,
  Dialog,
  Select,
  Switcher,
} from '@/components/ui';
import { t } from 'i18next';
import dayjs from 'dayjs';
import { useState } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi';
import {
  setEditInvoiceDialog,
  setSelectedInvoice,
  updateInvoice,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { paymentModeData, paymentStateData } from '../constants';
import { Invoice } from '@/@types/invoice';

export const VAT_AMOUNT = 20

export type InvoiceFormModel = Omit<Invoice, 'documentId' | 'customer' | 'orderItems'> & {
  documentId?: string;
  customer?: string | null;
  orderItems?: string[];
};

function ModalEditInvoice() {
  const { editInvoiceDialog, selectedInvoice } = useAppSelector(
    (state) => state.invoices.data
  );
  const [vatEnabled, setVatEnabled] = useState<boolean>(true);
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<InvoiceFormModel>({
    documentId: selectedInvoice?.documentId ?? '',
    name: selectedInvoice?.name || '',
    amount: selectedInvoice?.amount || 0,
    vatAmount: selectedInvoice?.vatAmount || 0,
    totalAmount: selectedInvoice?.totalAmount || 0,
    date: selectedInvoice?.date || new Date(0),
    dueDate: selectedInvoice?.dueDate || new Date(0),
    paymentDate: selectedInvoice?.paymentDate || new Date(0),
    paymentMethod: selectedInvoice?.paymentMethod || '',
    paymentReference: selectedInvoice?.paymentReference || '',
    paymentState: selectedInvoice?.paymentState || '',
    paymentAmount: selectedInvoice?.paymentAmount || 0,
    state: selectedInvoice?.state || '',
    customer: selectedInvoice?.customer?.documentId || null,
    orderItems: selectedInvoice?.orderItems.filter((orderItem) => orderItem).map((orderItem) => orderItem!.documentId) || [],
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(updateInvoice(formData));
    setFormData({
      documentId: '',
      name: '',
      amount: 0,
      vatAmount: 0,
      totalAmount: 0,
      date: new Date(0),
      dueDate: new Date(0),
      paymentDate: new Date(0),
      paymentMethod: '',
      paymentReference: '',
      paymentState: 'pending',
      paymentAmount: 0,
      state: 'pending',
      customer:  null,
      orderItems: [],
    });
    handleClose();
  };
  
  const handleClose = () => {
    dispatch(setEditInvoiceDialog(false));
    dispatch(setSelectedInvoice(null));
  };

  const handleVATToggle = (checked: boolean) => {
    setVatEnabled(checked)
    const vatAmount = checked ? formData.amount * 0.2 : 0;
    const totalAmount = formData.amount + vatAmount;

    setFormData({
      ...formData,
      vatAmount: vatAmount,
      totalAmount: totalAmount,
    });
  };

  return (
    <div>
      <Dialog isOpen={editInvoiceDialog} onClose={handleClose} width={1200}>
        <div className="flex flex-col justify-between">
          <h5 className="mb-4">REF : {formData.name}</h5>

          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                Date facturation
              </p>
              <DatePicker
                placeholder="Date de début"
                value={dayjs(formData.date).toDate()}
                inputPrefix={<HiOutlineCalendar className="text-lg" />}
                inputFormat="DD/MM/YYYY"
                onChange={(date: Date | null) => {
                  setFormData({
                    ...formData,
                    date: dayjs(date).toDate(),
                  });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Date d'échéance</p>
              <DatePicker
                placeholder="Date d'échéance"
                value={dayjs(formData.dueDate).toDate()}
                inputPrefix={<HiOutlineCalendar className="text-lg" />}
                onChange={(date: Date | null) => {
                  setFormData({ ...formData, dueDate: dayjs(date).toDate() });
                }}
                inputFormat="DD/MM/YYYY"
              />
            </div>

            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                Mode de paiement
              </p>
              <Select
                placeholder="Mode de paiement"
                options={paymentModeData}
                value={paymentModeData.find(
                  (item) => item.value === formData.paymentMethod
                )}
                noOptionsMessage={() => 'Aucun mode de paiement trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, paymentMethod: e?.value || '' });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                Statut de paiement
              </p>
              <Select
                placeholder="Statut de paiement"
                options={paymentStateData}
                value={paymentStateData.find(
                  (item) => item.value === formData.paymentState
                )}
                noOptionsMessage={() => 'Aucun statut de paiement trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, paymentState: e?.value || '' });
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 mt-4">
            <div className="flex justify-start items-center gap-2 mt-4 col-span-8">
              <span className="text-sm text-gray-200">TVA</span>
              <Switcher
                checked={vatEnabled}
                onChange={(e) => handleVATToggle(!vatEnabled)}
              />
            </div>
            <div className="flex flex-col items-end gap-2 justify-end text-right col-span-2">
              <span className="text-sm text-gray-200">Sous-total: </span>
              <span className="text-sm text-gray-200">
                TVA ({vatEnabled ? VAT_AMOUNT : 0}%):{' '}
              </span>
              <span className="text-sm text-gray-200">Total:</span>
            </div>
            <div className="flex flex-col items-end gap-2 justify-end text-right col-span-2">
              <span className="text-sm text-gray-200">
                {formData.amount.toFixed(2)} €
              </span>
              <span className="text-sm text-gray-200">
                {formData.vatAmount.toFixed(2)} €
              </span>
              <span className="text-sm text-gray-200">
                {formData.totalAmount.toFixed(2)} €
              </span>
            </div>
          </div>
          <div className="text-right mt-6">
            <Button
              className="ltr:mr-2 rtl:ml-2"
              variant="plain"
              onClick={handleClose}
            >
              {t('cancel')}
            </Button>
            <Button variant="solid" onClick={handleSubmit}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalEditInvoice;
