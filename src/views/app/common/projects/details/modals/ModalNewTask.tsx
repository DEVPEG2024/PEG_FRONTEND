import { Button, DatePicker, Dialog, Input, Select } from '@/components/ui';
import { t } from 'i18next';
import FieldCustom from '../../modals/components/fileds';
import dayjs from 'dayjs';
import { useState } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi';
import {
  createTask,
  setNewDialogTask,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { priorityData, statsDataTask } from '../../lists/constants';
import { Task } from '@/@types/project';
import { RichTextEditor } from '@/components/shared';

export type TaskFormModel = Omit<Task, 'documentId'> & {
  documentId?: string;
};

function ModalNewTask() {
  const { newDialogTask, project } = useAppSelector(
    (state) => state.projectDetails.data
  );
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<TaskFormModel>({
    name: '',
    description: '',
    state: 'pending',
    priority: 'low',
    startDate: new Date(),
    endDate: new Date(),
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(createTask({task: formData, project: project!}));
    setFormData({
      name: '',
      description: '',
      state: 'pending',
      priority: 'low',
      startDate: new Date(),
      endDate: new Date(),
    });
    handleClose();
  };
  
  const handleClose = () => {
    dispatch(setNewDialogTask(false));
  };

  return (
    <div>
      <Dialog isOpen={newDialogTask} onClose={handleClose}>
        <div className="flex flex-col h-full justify-between">
          <h5 className="mb-4">Ajouter une tâche</h5>
          <FieldCustom
            placeholder="Titre de la tâche"
            value={formData.name}
            setValue={(e: any) => {
              setFormData({ ...formData, name: e });
            }}
          />
          <RichTextEditor
            value={formData.description}
            className="mt-4"
            onChange={(e: any) => {
              setFormData({ ...formData, description: e });
            }}
          />
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Priorité</p>
              <Select
                placeholder="Priorité"
                options={priorityData}
                noOptionsMessage={() => 'Aucun priorité trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, priority: e?.value || 'low' });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Statut</p>
              <Select
                placeholder="Statut"
                options={statsDataTask}
                noOptionsMessage={() => 'Aucun statut trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, state: e?.value || 'pending' });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Date de début</p>
              <DatePicker
                placeholder="Date de début"
                value={dayjs(formData.startDate).toDate()}
                inputPrefix={<HiOutlineCalendar className="text-lg" />}
                inputFormat="DD/MM/YYYY"
                onChange={(date: Date | null) => {
                  setFormData({ ...formData, startDate: dayjs(date).toDate() });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Date de fin</p>
              <DatePicker
                placeholder="Date de fin"
                value={dayjs(formData.endDate).toDate()}
                inputPrefix={<HiOutlineCalendar className="text-lg" />}
                onChange={(date: Date | null) => {
                  setFormData({ ...formData, endDate: dayjs(date).toDate() });
                }}
                inputFormat="DD/MM/YYYY"
              />
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

export default ModalNewTask;
