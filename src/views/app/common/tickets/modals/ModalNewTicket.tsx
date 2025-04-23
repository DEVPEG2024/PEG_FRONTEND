import { Button, Dialog, Input, Select } from '@/components/ui';
import { t } from 'i18next';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { ticketPriorityData, ticketTypeData } from '../constants';
import { RichTextEditor } from '@/components/shared';
import { createTicket, setNewTicketDialog } from '../store/ticketSlice';
import FileUplaodCustom from '@/components/shared/Upload';
import { TicketFormModel } from './ModalEditTicket';
import { PegFile } from '@/@types/pegFile';
import { User } from '@/@types/user';

function ModalNewTicket() {
  const { user }: { user: User } = useAppSelector(
    (state: any) => state.auth.user
  );
  const { newTicketDialog } = useAppSelector((state) => state.tickets.data);
  const [image, setImage] = useState<PegFile | undefined>(undefined);
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<TicketFormModel>({
    name: '',
    user: user.documentId,
    description: '',
    state: 'pending',
    priority: '',
    type: '',
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(createTicket({ ...formData, image }));
    setFormData({
      name: '',
      user: '',
      description: '',
      state: '',
      priority: '',
      type: '',
    });
    handleClose();
  };
  const handleClose = () => {
    dispatch(setNewTicketDialog(false));
  };

  return (
    <div>
      <Dialog isOpen={newTicketDialog} onClose={handleClose} width={1200}>
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
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Priorité</p>
              <Select
                placeholder="Priorité"
                options={ticketPriorityData}
                noOptionsMessage={() => 'Aucune priorité trouvée'}
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
          <div className="flex flex-col gap-2 mt-4">
            <FileUplaodCustom setImage={setImage} />
          </div>
          <div className="text-right mt-6 flex flex-row items-center justify-end gap-2">
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

export default ModalNewTicket;
