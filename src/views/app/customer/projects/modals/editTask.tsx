import { Button, DatePicker, Dialog, Select } from '@/components/ui';
import { t } from 'i18next';
import FieldCustom from './components/fileds';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi';
import {
  setCloseEditDialogTask,
  setEditTaskSelected,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { priorityData, statsDataTask } from '../lists/constants';
import { RichTextEditor } from '@/components/shared';
import { injectReducer } from '@/store';
import reducer from '../store';

injectReducer('customerProjects', reducer);

function ModalEditTask() {
  const { editDialogTask } = useAppSelector((state) => state.customerProjects.data);
  const { selectedTask } = useAppSelector((state) => state.customerProjects.data);
  const [description, setDescription] = useState('');

  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    _id: '',
    title: '',
    description: '',
    priority: 'low',
    status: 'pending',
    startDate: new Date(),
    endDate: new Date(),
  });

  useEffect(() => {
    if (selectedTask) {
      setFormData({
        _id: selectedTask._id,
        title: selectedTask.title,
        description: selectedTask.description,
        priority: selectedTask.priority,
        status: selectedTask.status,
        startDate: dayjs(selectedTask.startDate).toDate(),
        endDate: dayjs(selectedTask.endDate).toDate(),
      });
    }
  }, [selectedTask]);
  useEffect(() => {
    if (selectedTask) {
      setDescription(selectedTask.description);
    }
  }, [selectedTask]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(
      setEditTaskSelected({
        ...selectedTask,
        ...formData,
        description: description,
        startDate: dayjs(formData.startDate).toISOString(),
        endDate: dayjs(formData.endDate).toISOString(),
      })
    );
    handleClose();
  };
  const handleClose = () => {
    dispatch(setCloseEditDialogTask());
  };
  const handleDescriptionChange = useCallback((newContent: string) => {
    setDescription(newContent);
  }, []);
  return (
    <div>
      <Dialog isOpen={editDialogTask} onClose={handleClose}>
        <div className="flex flex-col h-full justify-between">
          <h5 className="mb-4">Ajouter une tâche</h5>
          <FieldCustom
            placeholder="Titre de la tâche"
            value={formData.title}
            setValue={(e: any) => {
              setFormData({ ...formData, title: e });
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
                  setFormData({ ...formData, priority: e?.value || '' });
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
                  (status) => status.value === formData.status
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, status: e?.value || '' });
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

export default ModalEditTask;
