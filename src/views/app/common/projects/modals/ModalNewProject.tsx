import { Button, DatePicker, Dialog, Input, Select } from '@/components/ui';
import { t } from 'i18next';
import FieldCustom from './components/fileds';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi';
import {
  createProject,
  setNewProjectDialog,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { priorityData, stateData } from '../lists/constants';
import { unwrapData } from '@/utils/serviceHelper';
import { GetCustomersResponse, apiGetCustomers } from '@/services/CustomerServices';
import { Customer } from '@/@types/customer';
import { GetProducersResponse, apiGetProducers } from '@/services/ProducerServices';
import { Producer } from '@/@types/producer';
import { Project } from '@/@types/project';

type Option = {
  value: string;
  label: string;
};

type ProjectFormModel = Omit<Project, 'documentId' | 'customer' | 'producer' | 'comments' | 'images' | 'tasks' | 'orderItem' | 'invoices' | 'paymentDate' | 'paymentMethod' | 'paymentState'> & {
  documentId?: string;
  customer: string | null;
  producer: string | null;
}

function ModalNewProject() {
  const { newProjectDialog, loading } = useAppSelector(
    (state) => state.projects.data
  );
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<ProjectFormModel>({
    name: '',
    description: '',
    startDate: dayjs().toDate(),
    endDate: dayjs().add(30, 'day').toDate(),
    state: 'pending',
    customer: '',
    producer: '',
    priority: 'low',
    price: 0,
    producerPrice: 0,
    paidPrice: 0,
  });
  const [customers, setCustomers] = useState<Option[]>([]);
  const [producers, setProducers] = useState<Option[]>([]);

  useEffect(() => {
    fetchCustomers();
    fetchProducers();
  }, []);

  const fetchCustomers = async () => {
    const {customers_connection} : {customers_connection: GetCustomersResponse}= await unwrapData(apiGetCustomers());
    const customersList = customers_connection.nodes || [];
    const customers = customersList.map((customer: Customer) => ({
      value: customer.documentId || '',
      label: customer.name,
    }));
    setCustomers(customers);
  };

  const fetchProducers = async () => {
    const {producers_connection} : {producers_connection: GetProducersResponse}= await unwrapData(apiGetProducers());
    const producersList = producers_connection.nodes || [];
    const producers = producersList.map((producer: Producer) => ({
      value: producer.documentId || '',
      label: producer.name,
    }));
    setProducers(producers);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(createProject({...formData, customer: formData.customer !== '' ? {documentId: formData.customer} : null, producer: formData.producer !== '' ? {documentId: formData.producer} : null}));
    handleClose();
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
            value={formData.name}
            setValue={(e: any) => {
              setFormData({ ...formData, name: e });
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
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: Number(e.target.value) });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200">Commission du producteur</p>
              <Input
                type="number"
                placeholder={t('projects.producerPrice')}
                value={formData.producerPrice}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    producerPrice: Number(e.target.value),
                  });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200">Montant payé par le client</p>
              <Input
                type="number"
                placeholder={t('projects.paidPrice')}
                value={formData.paidPrice}
                onChange={(e) => {
                  setFormData({ ...formData, paidPrice: Number(e.target.value) });
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
                options={stateData}
                noOptionsMessage={() => 'Aucun statut trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, state: e?.value || '' });
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
            <Button variant="solid" onClick={handleSubmit} loading={loading}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalNewProject;
