import { Button, Dialog, Input, Select } from '@/components/ui';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  ticketPriorityData,
  ticketStatusData,
  ticketTypeData,
} from '../constants';
import { RichTextEditor } from '@/components/shared';
import {
  setEditTicketDialog,
  setSelectedTicket,
  updateTicket,
} from '../store/ticketSlice';
import { Ticket } from '@/@types/ticket';
import FileUplaodCustom from '@/components/shared/Upload';
import { Image } from '@/@types/image';
import { apiLoadImagesAndFiles } from '@/services/FileServices';

export type TicketFormModel = Omit<
  Ticket,
  'user' | 'image' | 'orderItems' | 'documentId' | 'createdAt'
> & {
  documentId?: string;
  user: string | null;
};

function ModalEditTicket() {
  const dispatch = useAppDispatch();
  const { editTicketDialog, selectedTicket } = useAppSelector(
    (state) => state.tickets.data
  );
  const [image, setImage] = useState<Image | undefined>(undefined);
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
    if (selectedTicket?.image) {
      const imageLoaded: Image = (
        await apiLoadImagesAndFiles([selectedTicket.image])
      )[0];

      setImage(imageLoaded);
    }
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

  return (
    <div>
      <Dialog isOpen={editTicketDialog} onClose={handleClose} width={1200}>
        <div className="flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 ">
              <Input
                value={formData.name}
                placeholder="Titre"
                onChange={(e: any) => {
                  setFormData({ ...formData, name: e.target.value });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/4">
              <p className="text-sm text-gray-200 mb-2 mt-4">Statut</p>
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
            <div className="flex flex-col gap-2 w-1/4">
              <p className="text-sm text-gray-200 mb-2 mt-4">Priorité</p>
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
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Type du ticket</p>
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
          <div className="flex flex-col gap-2 mt-4">
            <RichTextEditor
              value={formData.description}
              onChange={(value: string, delta: any, source: string) => {
                if (source === 'user') {
                  setFormData({ ...formData, description: value });
                }
              }}
            />
          </div>
          <div className="text-right mt-6 flex flex-row items-center justify-end gap-2">
            <FileUplaodCustom image={image} setImage={setImage} />
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

export default ModalEditTicket;
