import { Button, DatePicker, Dialog, Input, Select } from '@/components/ui';
import { t } from 'i18next';
import FieldCustom from './components/fileds';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { createProject } from '@/utils/hooks/projects/useCreateProject';
import { HiOutlineCalendar } from 'react-icons/hi';
import {
  getCustomerProjects,
  setNewProjectDialog,
  useAppDispatch,
  useAppSelector,
} from '../store';
import useCustomer from '@/utils/hooks/customers/useCustomer';
import useProducer from '@/utils/hooks/producers/useProducer';
import useUniqueId from '@/components/ui/hooks/useUniqueId';
import { priorityData, statusData } from '../lists/constants';

type Option = {
  value: number;
  label: string;
};

function ModalNewProject() {
  const { newProjectDialog } = useAppSelector(
    (state) => state.projectList.data
  );
  const newId = useUniqueId('PR-', 10);
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    ref: newId,
    description: '',
    priority: 'low',
    status: 'pending',
    amount: 0,
    amountProducers: 0,
    customer: '',
    producer: '',
    startDate: dayjs().toDate(),
    endDate: dayjs().add(30, 'day').toDate(),
  });
  const [customers, setCustomers] = useState<Option[]>([]);
  const [producers, setProducers] = useState<Option[]>([]);
  const { getCustomers } = useCustomer();
  const { getProducers } = useProducer();

  useEffect(() => {
    getUsers();
  }, []);

  const getUsers = async () => {
    const res = await getCustomers(1, 10000, '');
    const resProducer = await getProducers(1, 10000, '');
    if (res && res.data) {
      setCustomers(
        res.data.map((item: any) => ({
          _id: item._id,
          label:
            item.companyName + ' - ' + item.firstName + ' ' + item.lastName,
          value: item._id,
        }))
      );
    }
    if (resProducer && resProducer.data) {
      setProducers(
        resProducer.data.map((item: any) => ({
          _id: item._id,
          label:
            item.companyName + ' - ' + item.firstName + ' ' + item.lastName,
          value: item._id,
        }))
      );
    }
  };
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    const resp = await createProject(formData);
    if (resp.status === 'success') {
      setIsLoading(false);
      handleClose();
      dispatch(getCustomerProjects({ page: 1, pageSize: 4, searchTerm: '' }));
    } else {
      setIsLoading(false);
    }
  };
  const handleClose = () => {
    dispatch(setNewProjectDialog(false));
  };

  return (
    <div>
      <Dialog isOpen={newProjectDialog} onClose={handleClose} width={800}>
        <div className="flex flex-col h-full justify-between">
          <h5 className="mb-4">{t('projects.add')}</h5>
          <FieldCustom
            placeholder={t('projects.projectName')}
            value={formData.title}
            setValue={(e: any) => {
              setFormData({ ...formData, title: e });
            }}
          />
          <Input
            textArea
            rows={4}
            className="mt-4"
            placeholder={t('projects.projectDescription')}
            value={formData.description}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
            }}
          />
          <div className="flex flex-row gap-2 mt-4">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200">Montant du projet</p>
              <Input
                type="number"
                placeholder={t('projects.amount')}
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: Number(e.target.value) });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200">Commission du producteur</p>
              <Input
                type="number"
                placeholder={t('projects.amountProducers')}
                value={formData.amountProducers}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    amountProducers: Number(e.target.value),
                  });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                {t('projects.selectCustomer')}
              </p>
              <Select
                placeholder={t('projects.selectCustomer')}
                options={customers}
                noOptionsMessage={() => 'Aucun client trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, customer: e?.value || '' });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                {t('projects.selectProducer')}
              </p>
              <Select
                placeholder={t('projects.selectProducer')}
                options={producers}
                noOptionsMessage={() => 'Aucun producteur trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, producer: e?.value || '' });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Priorité</p>
              <Select
                placeholder="Priorité"
                options={priorityData}
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
                options={statusData}
                noOptionsMessage={() => 'Aucun statut trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, status: e?.value || '' });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                {t('projects.projectStartDate')}
              </p>
              <DatePicker
                placeholder={t('projects.projectStartDate')}
                value={dayjs(formData.startDate).toDate()}
                inputPrefix={<HiOutlineCalendar className="text-lg" />}
                inputFormat="DD/MM/YYYY"
                onChange={(date: Date | null) => {
                  setFormData({ ...formData, startDate: dayjs(date).toDate() });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                {t('projects.projectEndDate')}
              </p>
              <DatePicker
                placeholder={t('projects.projectEndDate')}
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
            <Button variant="solid" onClick={handleSubmit} loading={isLoading}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalNewProject;
