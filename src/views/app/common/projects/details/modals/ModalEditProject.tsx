import {
  Button,
  DatePicker,
  Dialog,
  Input,
  Select,
  Switcher,
} from '@/components/ui';
import { t } from 'i18next';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { HiOutlineCalendar, HiCurrencyEuro, HiUserGroup, HiFlag, HiCog } from 'react-icons/hi';
import {
  setEditCurrentProjectDialog,
  updateCurrentProject,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { priorityData, stateData } from '../../lists/constants';
import { Project } from '@/@types/project';
import { unwrapData } from '@/utils/serviceHelper';
import {
  apiGetCustomers,
  GetCustomersResponse,
} from '@/services/CustomerServices';
import { Customer } from '@/@types/customer';
import {
  apiGetProducers,
  GetProducersResponse,
} from '@/services/ProducerServices';
import { Producer } from '@/@types/producer';

type Option = {
  value: string;
  label: string;
};

export type ProjectFormModel = Omit<
  Project,
  'customer' | 'producer' | 'documentId' | 'images'
> & {
  documentId?: string;
  customer: string | null;
  producer: string | null;
};

const SectionTitle = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', marginTop: '8px' }}>
    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{icon}</span>
    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {label}
    </span>
    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
  </div>
);

const FieldLabel = ({ label }: { label: string }) => (
  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>{label}</p>
);

function ModalEditProject() {
  const { editCurrentProjectDialog, project, loading } = useAppSelector(
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
    const {
      customers_connection,
    }: { customers_connection: GetCustomersResponse } =
      await unwrapData(apiGetCustomers());
    const customersList = customers_connection.nodes || [];
    setCustomers(customersList.map((c: Customer) => ({ value: c.documentId || '', label: c.name })));
  };

  const fetchProducers = async () => {
    const {
      producers_connection,
    }: { producers_connection: GetProducersResponse } =
      await unwrapData(apiGetProducers());
    const producersList = producers_connection.nodes || [];
    setProducers(producersList.map((p: Producer) => ({ value: p.documentId || '', label: p.name || '' })));
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
    <Dialog
      isOpen={editCurrentProjectDialog}
      onClose={handleClose}
      width={720}
      contentClassName="!p-0"
    >
      <div style={{ fontFamily: 'Inter, sans-serif', padding: '28px 32px', maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Modifier
          </p>
          <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {project?.name}
          </h3>
        </div>

        {/* Nom + Description */}
        <div style={{ marginBottom: '20px' }}>
          <FieldLabel label="Nom du projet" />
          <Input
            value={formData.name as string}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nom du projet"
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <FieldLabel label="Description" />
          <Input
            textArea
            rows={3}
            value={formData.description as string}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description du projet"
          />
        </div>

        {/* Finances */}
        <SectionTitle icon={<HiCurrencyEuro size={14} />} label="Finances" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div>
            <FieldLabel label="Montant total" />
            <Input
              type="number"
              value={formData.price as number}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <FieldLabel label="Commission producteur" />
            <Input
              type="number"
              value={formData.producerPrice as number}
              onChange={(e) => setFormData({ ...formData, producerPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <FieldLabel label="Payé par le client" />
            <Input
              type="number"
              value={formData.paidPrice as number}
              onChange={(e) => setFormData({ ...formData, paidPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <FieldLabel label="Payé au producteur" />
            <Input
              type="number"
              value={formData.producerPaidPrice as number}
              onChange={(e) => setFormData({ ...formData, producerPaidPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Acteurs */}
        <SectionTitle icon={<HiUserGroup size={14} />} label="Acteurs" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end', marginBottom: '20px' }}>
          <div>
            <FieldLabel label="Client" />
            <Select
              placeholder="Choisir un client"
              options={customers}
              noOptionsMessage={() => 'Aucun client trouvé'}
              value={customers.find((c) => c.value == formData.customer)}
              onChange={(e: any) => setFormData({ ...formData, customer: e?.value || null })}
            />
          </div>
          <div>
            <FieldLabel label="Producteur" />
            <Select
              isClearable
              placeholder="Choisir un producteur"
              options={producers}
              noOptionsMessage={() => 'Aucun producteur trouvé'}
              value={producers.find((p) => p.value == formData.producer)}
              onChange={(e: any) => setFormData({ ...formData, producer: e?.value || null })}
            />
          </div>
          <div style={{ paddingBottom: '4px' }}>
            <FieldLabel label="Pool" />
            <Switcher
              checked={formData.poolable}
              onChange={() => setFormData({ ...formData, poolable: !formData.poolable })}
            />
          </div>
        </div>

        {/* Statut + Priorité */}
        <SectionTitle icon={<HiFlag size={14} />} label="Statut & Priorité" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div>
            <FieldLabel label="Priorité" />
            <Select
              placeholder="Choisir une priorité"
              options={priorityData}
              value={priorityData.find((p) => p.value == formData.priority)}
              onChange={(e: any) => setFormData({ ...formData, priority: e?.value || 'low' })}
            />
          </div>
          <div>
            <FieldLabel label="Statut" />
            <Select
              placeholder="Choisir un statut"
              options={stateData}
              value={stateData.find((s) => s.value == formData.state)}
              onChange={(e: any) => setFormData({ ...formData, state: e?.value || 'pending' })}
            />
          </div>
        </div>

        {/* Dates */}
        <SectionTitle icon={<HiOutlineCalendar size={14} />} label="Dates" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
          <div>
            <FieldLabel label="Date de début" />
            <DatePicker
              placeholder="Date de début"
              value={dayjs(formData.startDate).toDate()}
              inputPrefix={<HiOutlineCalendar className="text-lg" />}
              inputFormat="DD/MM/YYYY"
              onChange={(date: Date | null) => setFormData({ ...formData, startDate: dayjs(date).toDate() })}
            />
          </div>
          <div>
            <FieldLabel label="Date de fin" />
            <DatePicker
              placeholder="Date de fin"
              value={dayjs(formData.endDate).toDate()}
              inputPrefix={<HiOutlineCalendar className="text-lg" />}
              inputFormat="DD/MM/YYYY"
              onChange={(date: Date | null) => setFormData({ ...formData, endDate: dayjs(date).toDate() })}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: '10px',
              background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
              border: 'none',
              color: '#fff', fontSize: '13px', fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(47,111,237,0.4)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export default ModalEditProject;
