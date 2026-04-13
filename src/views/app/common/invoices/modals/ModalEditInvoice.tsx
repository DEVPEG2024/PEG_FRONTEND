import { DatePicker, Select, Switcher } from '@/components/ui';
import { t } from 'i18next';
import dayjs from 'dayjs';
import { useState } from 'react';
import { HiX, HiCheck } from 'react-icons/hi';
import { HiOutlineCalendar } from 'react-icons/hi';
import { paymentModeData, paymentStateData, stateData } from '../constants';
import { Invoice } from '@/@types/invoice';
import { TVA_RATE } from '@/utils/priceHelpers';

export const VAT_AMOUNT = 20;

export type InvoiceFormModel = Omit<
  Invoice,
  'documentId' | 'customer' | 'orderItems'
> & {
  documentId?: string;
  customer: string | null;
  orderItems: string[];
};

const modalStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

function ModalEditInvoice({
  editInvoiceDialog,
  selectedInvoice,
  setEditInvoiceDialog,
  setSelectedInvoice,
  updateInvoice,
  dispatch,
  loading,
}: {
  editInvoiceDialog: boolean;
  selectedInvoice: Invoice;
  setEditInvoiceDialog: (editInvoiceDialog: boolean) => any;
  setSelectedInvoice: (invoice: Invoice | null) => any;
  updateInvoice: (invoice: Invoice) => any;
  dispatch: (fonction: any) => any;
  loading: boolean;
}) {
  const [vatEnabled, setVatEnabled] = useState<boolean>(
    selectedInvoice.vatAmount > 0
  );
  const [formData, setFormData] = useState<InvoiceFormModel>({
    documentId: selectedInvoice?.documentId ?? '',
    name: selectedInvoice?.name || '',
    amount: selectedInvoice?.amount || 0,
    vatAmount: selectedInvoice?.vatAmount || 0,
    totalAmount: selectedInvoice?.totalAmount || 0,
    date: selectedInvoice?.date || new Date(),
    dueDate: selectedInvoice?.dueDate || new Date(),
    paymentDate: selectedInvoice?.paymentDate || new Date(),
    paymentMethod: selectedInvoice?.paymentMethod || '',
    paymentReference: selectedInvoice?.paymentReference || '',
    paymentState: selectedInvoice?.paymentState || '',
    paymentAmount: selectedInvoice?.paymentAmount || 0,
    state: selectedInvoice?.state || 'pending',
    customer: selectedInvoice?.customer?.documentId || null,
    orderItems:
      selectedInvoice?.orderItems
        .filter((orderItem) => orderItem)
        .map((orderItem) => orderItem!.documentId) || [],
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.name?.trim() || formData.amount <= 0 || !formData.state) {
      return;
    }
    dispatch(updateInvoice(formData));
  };

  const handleClose = () => {
    dispatch(setEditInvoiceDialog(false));
    dispatch(setSelectedInvoice(null));
  };

  const handleVATToggle = (checked: boolean) => {
    setVatEnabled(checked);
    const vatAmount = checked ? Math.round(formData.amount * TVA_RATE * 100) / 100 : 0;
    const totalAmount = formData.amount + vatAmount;

    setFormData({
      ...formData,
      vatAmount: vatAmount,
      totalAmount: totalAmount,
    });
  };

  if (!editInvoiceDialog) return null;

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: '6px',
    fontWeight: 500,
    letterSpacing: '0.3px',
  };

  const fieldGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  return (
    <>
      <style>{modalStyles}</style>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.25s ease-out',
        }}
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          style={{
            background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)',
            borderRadius: '20px',
            padding: '36px',
            width: '95%',
            maxWidth: '1100px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            animation: 'slideUp 0.35s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
                Modifier la facture
              </h2>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
                REF : {formData.name}
              </span>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)',
                transition: 'all 0.2s',
              }}
            >
              <HiX size={20} />
            </button>
          </div>

          {/* Separator */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: '28px' }} />

          {/* Row 1: Status + Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Statut</span>
              <Select
                placeholder="Statut"
                options={
                  formData.paymentState === 'fulfilled'
                    ? stateData.filter(({ value }) => value === 'fulfilled')
                    : stateData
                }
                value={stateData.find((item) => item.value === formData.state)}
                noOptionsMessage={() => 'Aucun statut trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, state: e?.value || '' });
                }}
              />
            </div>
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>{"Date d'émission"}</span>
              <DatePicker
                placeholder="Date de début"
                value={dayjs(formData.date).toDate()}
                inputPrefix={<HiOutlineCalendar style={{ fontSize: '18px' }} />}
                inputFormat="DD/MM/YYYY"
                onChange={(date: Date | null) => {
                  setFormData({
                    ...formData,
                    date: dayjs(date).toDate(),
                  });
                }}
              />
            </div>
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>{"Date d'échéance"}</span>
              <DatePicker
                placeholder="Date d'échéance"
                value={dayjs(formData.dueDate).toDate()}
                inputPrefix={<HiOutlineCalendar style={{ fontSize: '18px' }} />}
                onChange={(date: Date | null) => {
                  setFormData({ ...formData, dueDate: dayjs(date).toDate() });
                }}
                inputFormat="DD/MM/YYYY"
              />
            </div>
          </div>

          {/* Row 2: Payment info */}
          <div style={{ display: 'grid', gridTemplateColumns: formData.paymentState === 'fulfilled' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Mode de paiement</span>
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
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Statut de paiement</span>
              <Select
                placeholder="Statut de paiement"
                options={paymentStateData}
                value={paymentStateData.find(
                  (item) => item.value === formData.paymentState
                )}
                noOptionsMessage={() => 'Aucun statut de paiement trouvé'}
                onChange={(e: any) => {
                  const newValues = {
                    ...formData,
                    paymentState: e?.value || '',
                    state:
                      e.value === 'fulfilled' ? 'fulfilled' : formData.state,
                  };
                  setFormData(newValues);
                }}
              />
            </div>
            {formData.paymentState === 'fulfilled' && (
              <div style={fieldGroupStyle}>
                <span style={labelStyle}>Date de paiement</span>
                <DatePicker
                  placeholder="Date de paiement"
                  value={dayjs(formData.paymentDate).toDate()}
                  inputPrefix={<HiOutlineCalendar style={{ fontSize: '18px' }} />}
                  onChange={(date: Date | null) => {
                    setFormData({
                      ...formData,
                      paymentDate: dayjs(date).toDate(),
                    });
                  }}
                  inputFormat="DD/MM/YYYY"
                />
              </div>
            )}
          </div>

          {/* Separator */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: '24px' }} />

          {/* Summary section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* TVA toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>TVA ({VAT_AMOUNT}%)</span>
              <Switcher
                checked={vatEnabled}
                onChange={() => handleVATToggle(!vatEnabled)}
              />
            </div>

            {/* Totals */}
            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '14px',
                padding: '20px 28px',
                border: '1px solid rgba(255,255,255,0.06)',
                minWidth: '280px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>Sous-total</span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                  {formData.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
                  TVA ({vatEnabled ? VAT_AMOUNT : 0}%)
                </span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                  {formData.vatAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '16px', color: '#ffffff', fontWeight: 600 }}>Total</span>
                <span style={{ fontSize: '16px', color: '#60a5fa', fontWeight: 700 }}>
                  {formData.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
          </div>

          {/* Separator */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', margin: '24px 0' }} />

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px 24px',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <HiX size={16} />
              {t('cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                background: loading
                  ? 'rgba(59,130,246,0.3)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 28px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(59,130,246,0.3)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <HiCheck size={18} />
              {loading ? 'Enregistrement...' : t('save')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ModalEditInvoice;
