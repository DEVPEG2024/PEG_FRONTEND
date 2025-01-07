import { Button, DatePicker, Dialog, Input, Select, Switcher } from '@/components/ui';
import { t } from 'i18next';
import FieldCustom from '../../modals/components/fileds';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { HiOutlineCalendar } from 'react-icons/hi';
import {
  setEditCurrentProjectDialog,
  updateCurrentProject,
  useAppDispatch,
  useAppSelector,
} from '../store';
import _ from 'lodash';
import { priorityData, stateData } from '../../lists/constants';
import { Project } from '@/@types/project';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetCustomers, GetCustomersResponse } from '@/services/CustomerServices';
import { Customer } from '@/@types/customer';
import { apiGetProducers, GetProducersResponse } from '@/services/ProducerServices';
import { Producer } from '@/@types/producer';

type Option = {
  value: string;
  label: string;
};

export type ProjectFormModel = Omit<Project, 'customer' | 'producer' | 'documentId' | 'images'> & {
  documentId?: string;
  customer: string | null;
  producer: string | null;
};

function ModalEditProject() {
  const {editCurrentProjectDialog, project, loading} = useAppSelector(
    (state) => state.projectDetails.data
  );
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<ProjectFormModel>({
    documentId: project?.documentId || '',
    name: project?.name || '',
    description: project?.description || '',
    priority: project?.priority || 'low',
    state: project?.state || 'pending',
    price: project?.price || 0,
    producerPrice: project?.producerPrice || 0,
    customer: project?.customer?.documentId || null,
    producer: project?.producer?.documentId || null,
    startDate: dayjs(project?.startDate).toDate(),
    endDate: dayjs(project?.endDate).toDate(),
    paidPrice: project?.paidPrice || 0,
    producerPaidPrice: project?.producerPaidPrice || 0,
    comments: project?.comments || [],
    tasks: project?.tasks || [],
    invoices: project?.invoices || [],
    poolable: project?.poolable || false,
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
    const producers = producersList.map(
      (producer: Producer) => ({
        value: producer.documentId || '',
        label: producer.name || '',
      })
    );
    setProducers(producers);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(updateCurrentProject(formData));
    handleClose();
  };
  
  const handleClose = () => {
    dispatch(setEditCurrentProjectDialog(false));
  };

  return (
    <div>
      <Dialog isOpen={editCurrentProjectDialog} onClose={handleClose} width={800}>
        <div className="flex flex-col h-full justify-between">
          <h5 className="mb-4">{t('projects.editProject')}</h5>
          <FieldCustom
            placeholder={t('projects.projectName')}
            value={formData.name as string}
            setValue={(e: any) => {
              setFormData({ ...formData, name: e });
            }}
          />
          <Input
            textArea
            rows={4}
            className="mt-4"
            placeholder={t('projects.projectDescription')}
            value={formData.description as string}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
            }}
          />
          <div className="flex flex-row gap-2 mt-4">
            <div className="flex flex-col gap-2 w-1/2">
              <FieldCustom
                placeholder={t('projects.amount')}
                value={formData.price as number}
                type='number'
                setValue={(e: any) => {
                  setFormData({ ...formData, price: parseFloat(e) });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <FieldCustom
                placeholder={t('projects.producerPrice')}
                value={formData.producerPrice as number}
                type='number'
                setValue={(e: any) => {
                  setFormData({ ...formData, producerPrice: parseFloat(e) });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2 mt-4">
            <div className="flex flex-col gap-2 w-1/2">
              <FieldCustom
                placeholder={t('projects.paidPrice')}
                value={formData.paidPrice as number}
                type='number'
                setValue={(e: any) => {
                  setFormData({ ...formData, paidPrice: parseFloat(e) });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <FieldCustom
                placeholder={t('projects.producerPaidPrice')}
                value={formData.producerPaidPrice as number}
                type='number'
                setValue={(e: any) => {
                  setFormData({ ...formData, producerPaidPrice: parseFloat(e) });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-4/12">
              <p className="text-sm text-gray-200 mb-2 mt-4">Client</p>
              <Select
                placeholder={t('projects.selectCustomer')}
                options={customers}
                noOptionsMessage={() => 'Aucun client trouvé'}
                value={customers.find(
                  (customer) => customer.value == formData.customer
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, customer: e?.value || null });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-6/12">
              <p className="text-sm text-gray-200 mb-2 mt-4">Producteur</p>
              <Select
                isClearable={true}
                placeholder={t('projects.selectProducer')}
                options={producers}
                noOptionsMessage={() => 'Aucun producteur trouvé'}
                value={producers.find(
                  (producer) => producer.value == formData.producer
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, producer: e?.value || null });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-2/12">
              <span className="text-sm text-gray-200 mb-2 mt-4">Dans la piscine</span>
              <Switcher
                className="self-center"
                checked={formData.poolable}
                onChange={() => setFormData({ ...formData, poolable: !formData.poolable })}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Priorité</p>
              <Select
                placeholder="Choisir une priorité"
                options={priorityData}
                noOptionsMessage={() => 'Aucune priorité trouvée'}
                value={priorityData.find(
                  (priority) => priority.value == formData.priority
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, priority: e?.value || null });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Status</p>
              <Select
                placeholder={t('projects.selectState')}
                options={stateData}
                noOptionsMessage={() => 'Aucun statut trouvé'}
                value={stateData.find(
                  (status) => status.value == formData.state
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, state: e?.value || null });
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

export default ModalEditProject;
