import { Button, DatePicker, Dialog, Select } from '@/components/ui';
import { t } from 'i18next';
import FieldCustom from '../../modals/components/fileds';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi';
import {
  setEditDialogTask,
  updateTask,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { priorityData, statsDataTask } from '../../lists/constants';
import { RichTextEditor } from '@/components/shared';
import { TaskFormModel } from './ModalNewTask';

function ModalEditTask() {
  const { editDialogTask, selectedTask, loading } = useAppSelector(
    (state) => state.projectDetails.data
  );
  const [description, setDescription] = useState<string>(
    selectedTask?.description || ''
  );

  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<TaskFormModel>({
    documentId: selectedTask?.documentId || '',
    name: selectedTask?.name || '',
    description: selectedTask?.description || '',
    state: selectedTask?.state || 'pending',
    priority: selectedTask?.priority || 'low',
    startDate: selectedTask?.startDate || new Date(),
    endDate: selectedTask?.endDate || new Date(),
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(updateTask({ ...formData, description }));
  };

  const handleClose = () => {
    dispatch(setEditDialogTask(false));
  };

  const handleDescriptionChange = useCallback((newContent: string) => {
    setDescription(newContent);
  }, []);

  return (
    <div>
      <Dialog isOpen={editDialogTask} onClose={handleClose}>
        <div className="flex flex-col h-full justify-between">
          <h5 className="mb-4">Modifier une tâche</h5>
          <FieldCustom
            placeholder="Titre de la tâche"
            value={formData.name}
            setValue={(e: any) => {
              setFormData({ ...formData, name: e });
            }}
          />
          <RichTextEditor
            value={description}
            className="mt-4"
            onChange={handleDescriptionChange}
          />
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Priorité</p>
              <Select
                placeholder="Priorité"
                options={priorityData}
                value={priorityData.find(
                  (priority) => priority.value === formData.priority
                )}
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
                value={statsDataTask.find(
                  (status) => status.value === formData.state
                )}
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
            <Button variant="solid" onClick={handleSubmit} loading={loading}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalEditTask;
