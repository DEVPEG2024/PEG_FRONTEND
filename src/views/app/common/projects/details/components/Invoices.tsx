import { lazy, Suspense, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Container from '@/components/shared/Container';
import { HiBan, HiCheck, HiPencil, HiPrinter, HiUpload, HiDocumentText, HiTrash } from 'react-icons/hi';
import DetailsRight from './DetailsRight';
import { User } from '@/@types/user';
import { RootState, useAppDispatch } from '@/store';
import {
  addInvoice,
  deleteProjectInvoice,
  setEditProjectInvoiceDialog,
  setPrintProjectInvoiceDialog,
  setSelectedProjectInvoice,
  updateProjectInvoice,
  useAppSelector,
} from '../store';
import Empty from '@/components/shared/Empty';
import { GoTasklist } from 'react-icons/go';
import dayjs from 'dayjs';
import { Invoice } from '@/@types/invoice';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import ModalEditInvoice from '@/views/app/common/invoices/modals/ModalEditInvoice';
const ModalPrintInvoice = lazy(() => import('@/views/app/common/invoices/modals/ModalPrintInvoice'));
import { stateData } from '@/views/app/common/invoices/constants';
import { toast } from 'react-toastify';
import { apiUploadFile } from '@/services/FileServices';
import { TVA_RATE, fmtTTC, fmtHT } from '@/utils/priceHelpers';
import { apiGetNextInvoiceNumber } from '@/services/InvoicesServices';

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCancelInvoice = (invoice: Invoice) => {
    dispatch(
      updateProjectInvoice({
        documentId: invoice.documentId,
        state: 'canceled',
      })
    );
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    if (!window.confirm(`Supprimer la facture "${invoice.name}" ?`)) return;
    dispatch(deleteProjectInvoice({ invoiceDocumentId: invoice.documentId, project }));
  };

  const handleUpdateInvoice = (invoice: Invoice) => {
    dispatch(setSelectedProjectInvoice(invoice));
    dispatch(setEditProjectInvoiceDialog(true));
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    dispatch(setSelectedProjectInvoice(invoice));
    dispatch(setPrintProjectInvoiceDialog(true));
  };

  const generateInvoice = async (): Promise<void> => {
    const errorsOnGeneration: string[] = verifyGeneration();
    if (errorsOnGeneration.length > 0) {
      errorsOnGeneration.forEach((errorOnGeneration) =>
        toast.error(errorOnGeneration)
      );
    } else {
      try {
        const nextNumber = await apiGetNextInvoiceNumber();
        const invoice: Omit<Invoice, 'documentId'> = {
          customer: project.customer,
          orderItems: [],
          amount: project.price,
          vatAmount: project.price * TVA_RATE,
          totalAmount: project.price * (1 + TVA_RATE),
          name: nextNumber,
          date: dayjs().toDate(),
          dueDate: dayjs().add(30, 'day').toDate(),
          state: 'pending',
          paymentMethod: 'transfer',
          paymentAmount: 0,
          paymentReference: '',
          paymentState: 'pending',
          paymentDate: new Date(0),
        };
        dispatch(addInvoice({ invoice, project }));
      } catch {
        toast.error('Erreur lors de la génération du numéro de facture');
      }
    }
  };

  const verifyGeneration = (): string[] => {
    const errors: string[] = [];
    if (!project.customer) {
      errors.push('Aucun client renseigné sur le projet');
    }
    if (!project.price || project.price === 0) {
      errors.push('Le montant du projet est nul');
    }
    return errors;
  };

  const handleUploadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }
    setUploading(true);
    try {
      const uploadedFile = await apiUploadFile(file);
      const invoice: Omit<Invoice, 'documentId'> = {
        customer: project.customer,
        orderItems: [],
        amount: project.price || 0,
        vatAmount: (project.price || 0) * TVA_RATE,
        totalAmount: (project.price || 0) * (1 + TVA_RATE),
        name: file.name.replace(/\.pdf$/i, ''),
        date: dayjs().toDate(),
        dueDate: dayjs().add(30, 'day').toDate(),
        state: 'pending',
        paymentMethod: 'transfer',
        paymentAmount: 0,
        paymentReference: '',
        paymentState: 'pending',
        paymentDate: new Date(0),
        file: uploadedFile.id as any,
      };
      await dispatch(addInvoice({ invoice, project }));
      toast.success('Facture téléversée avec succès');
    } catch {
      toast.error('Erreur lors du téléversement de la facture');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const iconBtn = (danger = false): React.CSSProperties => ({
    width: '30px', height: '30px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)',
    color: danger ? '#f87171' : 'rgba(255,255,255,0.55)',
    transition: 'background 0.15s',
  });

  return (
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '20px', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Button loading={loading} onClick={generateInvoice}>
                Générer la facture du projet
              </Button>
              {!project?.orderItem && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleUploadInvoice}
                  />
                  <Button
                    loading={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    variant="twoTone"
                    icon={<HiUpload />}
                  >
                    Téléverser une facture
                  </Button>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {invoices.length > 0 ? (
              invoices.map((invoice: Invoice, index: number) => {
                const isPaid = invoice.paymentState === 'fulfilled';
                const isCanceled = invoice.state === 'canceled';
                const stateLabel = stateData.find(({ value }) => value === invoice.state)?.label ?? 'Indéterminé';
                return (
                  <div
                    key={invoice.documentId}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                      padding: '12px 16px', borderRadius: '12px',
                      background: isCanceled ? 'rgba(239,68,68,0.04)' : isPaid ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isCanceled ? 'rgba(239,68,68,0.15)' : isPaid ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    {/* Left info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', flexShrink: 0 }}>#{index + 1}</span>
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {invoice.name}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', flexShrink: 0 }}>{stateLabel}</span>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', flexShrink: 0 }}>{dayjs(invoice.date).format('DD/MM/YYYY')}</span>
                    </div>

                    {/* Right: amount + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{
                          background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
                          borderRadius: '100px', padding: '3px 10px',
                          color: '#6b9eff', fontSize: '12px', fontWeight: 700,
                        }}>
                          {fmtTTC(invoice.totalAmount)}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                          {fmtHT(invoice.amount)}
                        </span>
                      </div>

                      {/* Paid indicator */}
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                        background: isPaid ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isPaid ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isPaid && <HiCheck size={12} style={{ color: '#4ade80' }} />}
                      </div>

                      {invoice.file?.url && (
                        <a
                          href={invoice.file.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ ...iconBtn(), color: '#6fa3f5', textDecoration: 'none' }}
                          title="Voir le PDF"
                        >
                          <HiDocumentText size={14} />
                        </a>
                      )}
                      <button style={iconBtn()} onClick={() => handlePrintInvoice(invoice)}>
                        <HiPrinter size={14} />
                      </button>
                      {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
                        <button style={iconBtn()} onClick={() => handleUpdateInvoice(invoice)}>
                          <HiPencil size={14} />
                        </button>
                      )}
                      {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
                        <button
                          style={{ ...iconBtn(true), opacity: isCanceled ? 0.4 : 1, cursor: isCanceled ? 'not-allowed' : 'pointer' }}
                          onClick={() => !isCanceled && handleCancelInvoice(invoice)}
                          disabled={isCanceled}
                          title="Annuler"
                        >
                          <HiBan size={14} />
                        </button>
                      )}
                      {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
                        <button
                          style={iconBtn(true)}
                          onClick={() => handleDeleteInvoice(invoice)}
                          title="Supprimer"
                        >
                          <HiTrash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                <Empty icon={<GoTasklist size={80} style={{ color: 'rgba(255,255,255,0.12)' }} />}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginTop: '12px' }}>Aucune facture trouvée</p>
                </Empty>
              </div>
            )}
          </div>
        </div>
        <DetailsRight />
      </div>
      {selectedInvoice && editInvoiceDialog && hasRole(user, [SUPER_ADMIN, ADMIN]) && (
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
        <Suspense fallback={null}>
          <ModalPrintInvoice
            printInvoiceDialog={printInvoiceDialog}
            selectedInvoice={selectedInvoice}
            setPrintInvoiceDialog={setPrintProjectInvoiceDialog}
            setSelectedInvoice={setSelectedProjectInvoice}
            dispatch={dispatch}
          />
        </Suspense>
      )}
    </Container>
  );
};

export default Invoices;
