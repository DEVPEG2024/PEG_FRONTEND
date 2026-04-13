import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { HiArrowRight, HiArrowLeft, HiCheck, HiX, HiSparkles, HiUserGroup, HiCurrencyEuro, HiCalendar, HiDocumentText, HiFlag } from 'react-icons/hi';
import { apiRewriteDescription } from '@/services/ChatbotServices';
import { toast } from 'react-toastify';
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
  logo?: string;
};

export type ProjectFormModel = Omit<
  Project,
  'customer' | 'producer' | 'documentId' | 'images'
> & {
  documentId?: string;
  customer: string | null;
  producer: string | null;
};

const StepIndicator = ({ current, total, labels }: { current: number; total: number; labels: string[] }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '28px' }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: i === current ? '6px 14px' : '6px 10px',
          borderRadius: '100px',
          background: i < current ? 'rgba(34,197,94,0.12)' : i === current ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.04)',
          border: '1px solid ' + (i < current ? 'rgba(34,197,94,0.25)' : i === current ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.06)'),
          transition: 'all 0.3s',
        }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%', fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i < current ? '#22c55e' : i === current ? '#2f6fed' : 'rgba(255,255,255,0.08)',
            color: '#fff',
          }}>
            {i < current ? <HiCheck size={12} /> : i + 1}
          </div>
          {i === current && <span style={{ fontSize: '11px', fontWeight: 600, color: '#6fa3f5' }}>{labels[i]}</span>}
        </div>
        {i < total - 1 && <div style={{ width: '16px', height: '1px', background: 'rgba(255,255,255,0.08)' }} />}
      </div>
    ))}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '12px 14px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

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
    startDate: project?.startDate && dayjs(project.startDate).isValid() ? dayjs(project.startDate).toDate() : new Date(),
    endDate: project?.endDate && dayjs(project.endDate).isValid() ? dayjs(project.endDate).toDate() : null,
    paidPrice: project?.paidPrice || 0,
    producerPaidPrice: project?.producerPaidPrice || 0,
    comments: project?.comments || [],
    tasks: project?.tasks || [],
    invoices: project?.invoices || [],
    poolable: project?.poolable || false,
  });
  const [customers, setCustomers] = useState<Option[]>([]);
  const [producers, setProducers] = useState<Option[]>([]);
  const [rewriting, setRewriting] = useState(false);
  const [step, setStep] = useState(0);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProducer, setSearchProducer] = useState('');

  const STEPS = ['Info', 'Finances', 'Equipe & Dates', 'Confirmation'];

  useEffect(() => {
    if (editCurrentProjectDialog) {
      fetchCustomers();
      fetchProducers();
      setStep(0);
      // Re-sync form data with project when opening
      setFormData({
        documentId: project?.documentId || '',
        name: project?.name || '',
        description: project?.description || '',
        priority: project?.priority || 'low',
        state: project?.state || 'pending',
        price: project?.price || 0,
        producerPrice: project?.producerPrice || 0,
        customer: project?.customer?.documentId || null,
        producer: project?.producer?.documentId || null,
        startDate: project?.startDate && dayjs(project.startDate).isValid() ? dayjs(project.startDate).toDate() : new Date(),
        endDate: project?.endDate && dayjs(project.endDate).isValid() ? dayjs(project.endDate).toDate() : null,
        paidPrice: project?.paidPrice || 0,
        producerPaidPrice: project?.producerPaidPrice || 0,
        comments: project?.comments || [],
        tasks: project?.tasks || [],
        invoices: project?.invoices || [],
        poolable: project?.poolable || false,
      });
    }
  }, [editCurrentProjectDialog]);

  const fetchCustomers = async () => {
    const {
      customers_connection,
    }: { customers_connection: GetCustomersResponse } =
      await unwrapData(apiGetCustomers());
    const customersList = customers_connection.nodes || [];
    setCustomers(customersList.map((c: Customer) => ({ value: c.documentId || '', label: c.name, logo: (c as any).logo?.url })));
  };

  const fetchProducers = async () => {
    const {
      producers_connection,
    }: { producers_connection: GetProducersResponse } =
      await unwrapData(apiGetProducers());
    const producersList = producers_connection.nodes || [];
    setProducers(producersList.map((p: Producer) => ({ value: p.documentId || '', label: p.name || '' })));
  };

  const handleRewrite = async () => {
    if (!(formData.description as string)?.trim() || rewriting) return;
    setRewriting(true);
    try {
      const res = await apiRewriteDescription(formData.description as string, formData.name ? `Projet : ${formData.name}` : undefined);
      if (res.data?.result && res.data.description) {
        setFormData({ ...formData, description: res.data.description });
      } else {
        toast.error('Erreur lors de la reformulation');
      }
    } catch {
      toast.error('Service IA indisponible');
    } finally { setRewriting(false); }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await dispatch(updateCurrentProject(formData));
    handleClose();
  };

  const handleClose = () => {
    dispatch(setEditCurrentProjectDialog(false));
    setStep(0);
    setSearchCustomer('');
    setSearchProducer('');
  };

  if (!editCurrentProjectDialog) return null;

  const selectedCustomer = customers.find((c) => c.value === formData.customer);
  const selectedProducer = producers.find((p) => p.value === formData.producer);
  const filteredCustomers = customers.filter((c) => c.label.toLowerCase().includes(searchCustomer.toLowerCase()));
  const filteredProducers = producers.filter((p) => p.label.toLowerCase().includes(searchProducer.toLowerCase()));
  const price = formData.price as number || 0;
  const producerPrice = formData.producerPrice as number || 0;
  const paidPrice = formData.paidPrice as number || 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        width: '620px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
        background: 'linear-gradient(160deg, #1a2d47 0%, #0f1c2e 100%)',
        borderRadius: '20px', padding: '32px', position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={(e) => e.stopPropagation()}>

        <button onClick={handleClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
        }}><HiX size={16} /></button>

        <StepIndicator current={step} total={4} labels={STEPS} />

        {/* Step 0: Info */}
        {step === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(47,111,237,0.2), rgba(47,111,237,0.05))', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiDocumentText size={24} style={{ color: '#6fa3f5' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Informations du projet</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Nom, description et configuration</p>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={labelStyle}>Nom du projet *</span>
              <input type="text" placeholder="Nom du projet" value={formData.name as string} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={labelStyle}>Description</span>
              <textarea placeholder="Description du projet" value={formData.description as string} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              {(formData.description as string)?.trim() && (
                <button onClick={handleRewrite} disabled={rewriting} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px',
                  padding: '5px 12px', borderRadius: '8px',
                  background: 'linear-gradient(90deg, rgba(168,85,247,0.12), rgba(139,92,246,0.12))',
                  border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc', fontSize: '11px', fontWeight: 600,
                  cursor: rewriting ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: rewriting ? 0.6 : 1,
                }}>
                  <HiSparkles size={12} /> {rewriting ? 'Reformulation...' : 'Reformuler avec l\'IA'}
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <span style={labelStyle}>Priorite</span>
                <select value={formData.priority as string} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} style={{ ...inputStyle, appearance: 'auto' }}>
                  {priorityData.map((p: any) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <span style={labelStyle}>Statut</span>
                <select value={formData.state as string} onChange={(e) => setFormData({ ...formData, state: e.target.value })} style={{ ...inputStyle, appearance: 'auto' }}>
                  {stateData.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                <input type="checkbox" checked={formData.poolable} onChange={() => setFormData({ ...formData, poolable: !formData.poolable })} style={{ width: '16px', height: '16px', accentColor: '#2f6fed' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>Mettre dans la piscine (pool producteurs)</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={handleClose} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
              <button onClick={() => { if (!(formData.name as string)?.trim()) { toast.error('Nom du projet obligatoire'); return; } setStep(1); }} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: (formData.name as string)?.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif',
                background: (formData.name as string)?.trim() ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: '6px', boxShadow: (formData.name as string)?.trim() ? '0 4px 16px rgba(47,111,237,0.3)' : 'none',
              }}>Suivant <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 1: Finances */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiCurrencyEuro size={24} style={{ color: '#4ade80' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Finances</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Montants et commissions</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={labelStyle}>Montant total</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={formData.price as number || ''} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} placeholder="0" style={{ ...inputStyle, paddingRight: '32px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>EUR</span>
                </div>
              </div>
              <div>
                <span style={labelStyle}>Commission producteur</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={formData.producerPrice as number || ''} onChange={(e) => setFormData({ ...formData, producerPrice: parseFloat(e.target.value) || 0 })} placeholder="0" style={{ ...inputStyle, paddingRight: '32px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>EUR</span>
                </div>
              </div>
              <div>
                <span style={labelStyle}>Paye par le client</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={formData.paidPrice as number || ''} onChange={(e) => setFormData({ ...formData, paidPrice: parseFloat(e.target.value) || 0 })} placeholder="0" style={{ ...inputStyle, paddingRight: '32px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>EUR</span>
                </div>
              </div>
              <div>
                <span style={labelStyle}>Paye au producteur</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={formData.producerPaidPrice as number || ''} onChange={(e) => setFormData({ ...formData, producerPaidPrice: parseFloat(e.target.value) || 0 })} placeholder="0" style={{ ...inputStyle, paddingRight: '32px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>EUR</span>
                </div>
              </div>
            </div>

            {price > 0 && (
              <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Marge PEG</span>
                  <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700 }}>{(price - producerPrice).toFixed(2)} EUR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Reste a payer (client)</span>
                  <span style={{ color: paidPrice >= price ? '#4ade80' : '#fbbf24', fontSize: '13px', fontWeight: 700 }}>{(price - paidPrice).toFixed(2)} EUR</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setStep(0)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiArrowLeft size={14} /> Retour
              </button>
              <button onClick={() => setStep(2)} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 4px 16px rgba(47,111,237,0.3)',
              }}>Suivant <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 2: Team & Dates */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiUserGroup size={24} style={{ color: '#fbbf24' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Equipe & Dates</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Client, producteur et planning</p>
            </div>

            {/* Customer selection */}
            <div style={{ marginBottom: '14px' }}>
              <span style={labelStyle}>Client</span>
              <input type="text" placeholder="Rechercher un client..." value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                style={{ ...inputStyle, marginBottom: '8px' }}
              />
              <div style={{ maxHeight: '140px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredCustomers.map((c) => (
                  <div key={c.value} onClick={() => setFormData({ ...formData, customer: c.value === formData.customer ? null : c.value })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px',
                      background: formData.customer === c.value ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.02)',
                      border: '1.5px solid ' + (formData.customer === c.value ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.05)'),
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {c.logo ? <img src={c.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontWeight: 700 }}>{c.label[0]}</span>}
                    </div>
                    <span style={{ color: formData.customer === c.value ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, flex: 1 }}>{c.label}</span>
                    {formData.customer === c.value && <HiCheck size={14} style={{ color: '#2f6fed' }} />}
                  </div>
                ))}
                {filteredCustomers.length === 0 && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>Aucun client trouve</p>}
              </div>
            </div>

            {/* Producer selection */}
            <div style={{ marginBottom: '14px' }}>
              <span style={labelStyle}>Producteur</span>
              <input type="text" placeholder="Rechercher un producteur..." value={searchProducer}
                onChange={(e) => setSearchProducer(e.target.value)}
                style={{ ...inputStyle, marginBottom: '8px' }}
              />
              <div style={{ maxHeight: '140px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div onClick={() => setFormData({ ...formData, producer: null })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px',
                    background: !formData.producer ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.02)',
                    border: '1.5px solid ' + (!formData.producer ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.05)'),
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <span style={{ color: !formData.producer ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, flex: 1 }}>-- Aucun --</span>
                  {!formData.producer && <HiCheck size={14} style={{ color: '#2f6fed' }} />}
                </div>
                {filteredProducers.map((p) => (
                  <div key={p.value} onClick={() => setFormData({ ...formData, producer: p.value === formData.producer ? null : p.value })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px',
                      background: formData.producer === p.value ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.02)',
                      border: '1.5px solid ' + (formData.producer === p.value ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.05)'),
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    <span style={{ color: formData.producer === p.value ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, flex: 1 }}>{p.label}</span>
                    {formData.producer === p.value && <HiCheck size={14} style={{ color: '#2f6fed' }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <span style={labelStyle}>Date de debut</span>
                <input type="date" value={formData.startDate ? dayjs(formData.startDate).format('YYYY-MM-DD') : ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value ? dayjs(e.target.value).toDate() : new Date() })} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Date de fin</span>
                <input type="date" value={formData.endDate ? dayjs(formData.endDate).format('YYYY-MM-DD') : ''} onChange={(e) => setFormData({ ...formData, endDate: e.target.value ? dayjs(e.target.value).toDate() : null })} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiArrowLeft size={14} /> Retour
              </button>
              <button onClick={() => setStep(3)} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 4px 16px rgba(47,111,237,0.3)',
              }}>Suivant <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiCheck size={24} style={{ color: '#4ade80' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Confirmer les modifications</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Verifiez les informations avant d'enregistrer</p>
            </div>

            <div style={{ borderRadius: '14px', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <span style={{ ...labelStyle, marginBottom: '2px' }}>Projet</span>
                  <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: 0 }}>{formData.name as string || '--'}</p>
                </div>
                <div>
                  <span style={{ ...labelStyle, marginBottom: '2px' }}>Client</span>
                  <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: 0 }}>{selectedCustomer?.label || 'Aucun'}</p>
                </div>
              </div>

              {(formData.description as string) && (
                <div>
                  <span style={{ ...labelStyle, marginBottom: '2px' }}>Description</span>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>{(formData.description as string).length > 120 ? (formData.description as string).slice(0, 120) + '...' : formData.description as string}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prix</span>
                  <p style={{ color: '#4ade80', fontSize: '16px', fontWeight: 700, margin: '2px 0 0' }}>{price} EUR</p>
                </div>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producteur</span>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600, margin: '2px 0 0' }}>{selectedProducer?.label || 'Aucun'}</p>
                </div>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priorite</span>
                  <p style={{ color: formData.priority === 'high' ? '#f87171' : formData.priority === 'medium' ? '#fbbf24' : '#4ade80', fontSize: '14px', fontWeight: 600, margin: '2px 0 0' }}>
                    {priorityData.find((p: any) => p.value === formData.priority)?.label || formData.priority}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{formData.startDate ? dayjs(formData.startDate).format('DD/MM/YYYY') : '--'}</span>
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>-&gt;</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{formData.endDate ? dayjs(formData.endDate).format('DD/MM/YYYY') : '--'}</span>
                {formData.poolable && <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '4px', background: 'rgba(47,111,237,0.1)', color: '#6fa3f5', fontWeight: 700 }}>POOL</span>}
                <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {stateData.find((s: any) => s.value === formData.state)?.label || formData.state}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button onClick={() => setStep(2)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiArrowLeft size={14} /> Modifier
              </button>
              <button onClick={handleSubmit} disabled={loading} style={{
                padding: '12px 28px', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.4)',
              }}>
                {loading ? 'Enregistrement...' : 'Enregistrer'} <HiCheck size={16} />
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>
      </div>
    </div>
  );
}

export default ModalEditProject;
