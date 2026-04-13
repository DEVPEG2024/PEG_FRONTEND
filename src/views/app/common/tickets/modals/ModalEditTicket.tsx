import { Select } from '@/components/ui';
import FieldCustom from '@/views/app/common/projects/modals/components/fileds';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { HiX, HiCheck } from 'react-icons/hi';
import { useAppDispatch, useAppSelector } from '../store';
import {
  ticketPriorityData,
  ticketStatusData,
  ticketTypeData,
} from '../constants';
import { Loading, RichTextEditor } from '@/components/shared';
import {
  setEditTicketDialog,
  setSelectedTicket,
  updateTicket,
} from '../store/ticketSlice';
import { Ticket } from '@/@types/ticket';
import FileUplaodCustom from '@/components/shared/Upload';
import { PegFile } from '@/@types/pegFile';
import { apiLoadPegFilesAndFiles } from '@/services/FileServices';

export type TicketFormModel = Omit<
  Ticket,
  'user' | 'image' | 'orderItems' | 'documentId' | 'createdAt'
> & {
  documentId?: string;
  user: string | null;
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

function ModalEditTicket() {
  const dispatch = useAppDispatch();
  const { editTicketDialog, selectedTicket } = useAppSelector(
    (state) => state.tickets.data
  );
  const [image, setImage] = useState<PegFile | undefined>(undefined);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<TicketFormModel>({
    documentId: selectedTicket?.documentId ?? '',
    name: selectedTicket?.name || '',
    user: selectedTicket?.user?.documentId || null,
    description: selectedTicket?.description || '',
    state: selectedTicket?.state || '',
    priority: selectedTicket?.priority || '',
    type: selectedTicket?.type || '',
  });

  useEffect(() => {
    fetchImage();
  }, [selectedTicket]);

  const fetchImage = async (): Promise<void> => {
    setImageLoading(true);
    if (selectedTicket?.image) {
      const imageLoaded: PegFile = (
        await apiLoadPegFilesAndFiles([selectedTicket.image])
      )[0];

      setImage(imageLoaded);
    }
    setImageLoading(false);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(updateTicket({ ...formData, image: image?.id ?? null }));
    setFormData({
      documentId: '',
      name: '',
      priority: 'low',
      description: '',
      state: 'pending',
      user: '',
      type: '',
    });
    handleClose();
  };

  const handleClose = () => {
    dispatch(setEditTicketDialog(false));
    dispatch(setSelectedTicket(null));
  };

  if (!editTicketDialog) return null;

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
            maxWidth: '860px',
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
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.3px' }}>
              Modifier le ticket
            </h2>
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
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: '24px' }} />

          {/* Title field */}
          <div style={{ marginBottom: '20px' }}>
            <span style={labelStyle}>Titre</span>
            <div style={{ marginTop: '4px' }}>
              <FieldCustom
                placeholder="Titre"
                value={formData.name}
                setValue={(e: any) => {
                  setFormData({ ...formData, name: e });
                }}
              />
            </div>
          </div>

          {/* Row: Status, Priority, Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Statut</span>
              <Select
                placeholder="Statut"
                options={ticketStatusData}
                noOptionsMessage={() => 'Aucun statut trouvé'}
                value={ticketStatusData.find(
                  (priority) => priority.value === formData.state
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, state: e?.value || '' });
                }}
              />
            </div>
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Priorité</span>
              <Select
                placeholder="Priorité"
                options={ticketPriorityData}
                noOptionsMessage={() => 'Aucune priorité trouvée'}
                value={ticketPriorityData.find(
                  (priority) => priority.value === formData.priority
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, priority: e?.value || '' });
                }}
              />
            </div>
            <div style={fieldGroupStyle}>
              <span style={labelStyle}>Type du ticket</span>
              <Select
                placeholder="Type du ticket"
                options={ticketTypeData}
                noOptionsMessage={() => 'Aucun type de ticket trouvé'}
                value={ticketTypeData.find(
                  (type) => type.value === formData.type
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, type: e?.value || '' });
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '24px' }}>
            <span style={labelStyle}>Description</span>
            <div style={{ marginTop: '6px' }}>
              <RichTextEditor
                value={formData.description}
                onChange={(value: string) => {
                  setFormData({ ...formData, description: value });
                }}
              />
            </div>
          </div>

          {/* File upload */}
          <div style={{ marginBottom: '24px' }}>
            <span style={labelStyle}>Pièce jointe</span>
            <div
              style={{
                marginTop: '6px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '14px',
                padding: '16px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Loading loading={imageLoading}>
                <FileUplaodCustom image={image} setImage={setImage} />
              </Loading>
            </div>
          </div>

          {/* Separator */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: '24px' }} />

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
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 28px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
              }}
            >
              <HiCheck size={18} />
              {t('save')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ModalEditTicket;
