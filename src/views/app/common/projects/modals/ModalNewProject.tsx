import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { HiArrowRight, HiArrowLeft, HiCheck, HiX, HiSparkles, HiUserGroup, HiCurrencyEuro, HiCalendar, HiDocumentText } from 'react-icons/hi';
import { apiRewriteDescription } from '@/services/ChatbotServices';
import { toast } from 'react-toastify';
import { createProject, setNewProjectDialog, useAppDispatch, useAppSelector } from '../store';
import { priorityData, stateData } from '../lists/constants';
import { unwrapData } from '@/utils/serviceHelper';
import { GetCustomersResponse, apiGetCustomers } from '@/services/CustomerServices';
import { Customer } from '@/@types/customer';
import { GetProducersResponse, apiGetProducers } from '@/services/ProducerServices';
import { Producer } from '@/@types/producer';
import { Project } from '@/@types/project';

type Option = { value: string; label: string; logo?: string };

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
            {i < current ? <HiCheck size={12} /> : <span>{i + 1}</span>}
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

function ModalNewProject() {
  const { newProjectDialog, loading } = useAppSelector((state) => state.projects.data);
  const dispatch = useAppDispatch();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [producerPrice, setProducerPrice] = useState(0);
  const [paidPrice, setPaidPrice] = useState(0);
  const [producerPaidPrice, setProducerPaidPrice] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [producerId, setProducerId] = useState('');
  const [poolable, setPoolable] = useState(false);
  const [priority, setPriority] = useState('low');
  const [state, setState] = useState('pending');
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().add(30, 'day').format('YYYY-MM-DD'));

  // UI state
  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [producers, setProducers] = useState<Option[]>([]);
  const [rewriting, setRewriting] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchProducer, setSearchProducer] = useState('');

  const STEPS = ['Client', 'Projet', 'Finances', 'Confirmation'];

  useEffect(() => {
    if (newProjectDialog) {
      fetchCustomers();
      fetchProducers();
    }
  }, [newProjectDialog]);

  const fetchCustomers = async () => {
    try {
      const { customers_connection }: { customers_connection: GetCustomersResponse } = await unwrapData(apiGetCustomers());
      setCustomers((customers_connection.nodes || []).map((c: Customer) => ({ value: c.documentId || '', label: c.name, logo: c.logo?.url })));
    } catch {}
  };

  const fetchProducers = async () => {
    try {
      const { producers_connection }: { producers_connection: GetProducersResponse } = await unwrapData(apiGetProducers());
      setProducers((producers_connection.nodes || []).map((p: Producer) => ({ value: p.documentId || '', label: p.name })));
    } catch {}
  };

  const handleRewrite = async () => {
    if (!description.trim() || rewriting) return;
    setRewriting(true);
    try {
      const res = await apiRewriteDescription(description, name ? 'Projet : ' + name : undefined);
      if (res.data?.result && res.data.description) setDescription(res.data.description);
      else toast.error('Erreur lors de la reformulation');
    } catch { toast.error('Service IA indisponible'); }
    finally { setRewriting(false); }
  };

  const handleSubmit = () => {
    dispatch(createProject({
      name, description,
      startDate: dayjs(startDate).toDate(),
      endDate: dayjs(endDate).toDate(),
      state, priority, price, producerPrice, paidPrice, producerPaidPrice, poolable,
      customer: customerId ? { documentId: customerId } : null,
      producer: producerId ? { documentId: producerId } : null,
    } as any));
    handleClose();
  };

  const handleClose = () => {
    dispatch(setNewProjectDialog(false));
    setStep(0);
    setName(''); setDescription(''); setPrice(0); setProducerPrice(0);
    setPaidPrice(0); setProducerPaidPrice(0); setCustomerId('');
    setProducerId(''); setPoolable(false); setPriority('low');
    setState('pending'); setStartDate(dayjs().format('YYYY-MM-DD'));
    setEndDate(dayjs().add(30, 'day').format('YYYY-MM-DD'));
    setSearchCustomer(''); setSearchProducer('');
  };

  if (!newProjectDialog) return null;

  const selectedCustomer = customers.find((c) => c.value === customerId);
  const selectedProducer = producers.find((p) => p.value === producerId);
  const filteredCustomers = customers.filter((c) => c.label.toLowerCase().includes(searchCustomer.toLowerCase()));
  const filteredProducers = producers.filter((p) => p.label.toLowerCase().includes(searchProducer.toLowerCase()));

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

        {/* ═══ Step 0: Client ═══ */}
        {step === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiUserGroup size={24} style={{ color: '#fbbf24' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Choisir le client</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Sélectionnez le client pour ce projet</p>
            </div>

            <input type="text" placeholder="Rechercher un client..." value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              style={{ ...inputStyle, marginBottom: '12px' }}
            />

            <div style={{ maxHeight: '280px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredCustomers.map((c) => (
                <div key={c.value} onClick={() => setCustomerId(c.value === customerId ? '' : c.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px',
                    background: customerId === c.value ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.02)',
                    border: '1.5px solid ' + (customerId === c.value ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.05)'),
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {c.logo ? <img src={c.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: 700 }}>{c.label[0]}</span>}
                  </div>
                  <span style={{ color: customerId === c.value ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, flex: 1 }}>{c.label}</span>
                  {customerId === c.value && <HiCheck size={16} style={{ color: '#2f6fed' }} />}
                </div>
              ))}
              {filteredCustomers.length === 0 && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Aucun client trouvé</p>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={handleClose} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
              <button onClick={() => setStep(1)} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 4px 16px rgba(47,111,237,0.3)',
              }}>{customerId ? 'Suivant' : 'Passer'} <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ═══ Step 1: Project Info ═══ */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(47,111,237,0.2), rgba(47,111,237,0.05))', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiDocumentText size={24} style={{ color: '#6fa3f5' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Détails du projet</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Nom, description, équipe et planning</p>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={labelStyle}>Nom du projet *</span>
              <input type="text" placeholder="Ex: Impression flyers 500ex" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={labelStyle}>Description</span>
              <textarea placeholder="Décrivez le projet..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              {description.trim() && (
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

            {/* Producer + Pool + Priority + Status + Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <span style={labelStyle}>Producteur</span>
                <select value={producerId} onChange={(e) => setProducerId(e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
                  <option value="">-- Aucun --</option>
                  {producers.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <span style={labelStyle}>Priorité</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
                  {priorityData.map((p: any) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <span style={labelStyle}>Date de début</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Date de fin</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                <input type="checkbox" checked={poolable} onChange={() => setPoolable(!poolable)} style={{ width: '16px', height: '16px', accentColor: '#2f6fed' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>Mettre dans la piscine (pool producteurs)</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setStep(0)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiArrowLeft size={14} /> Retour
              </button>
              <button onClick={() => { if (!name.trim()) { toast.error('Nom du projet obligatoire'); return; } setStep(2); }} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif',
                background: name.trim() ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: '6px', boxShadow: name.trim() ? '0 4px 16px rgba(47,111,237,0.3)' : 'none',
              }}>Suivant <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ═══ Step 2: Finances ═══ */}
        {step === 2 && (
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
                <span style={labelStyle}>Prix du projet</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} placeholder="0" style={{ ...inputStyle, paddingRight: '32px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>€</span>
                </div>
              </div>
              <div>
                <span style={labelStyle}>Commission producteur</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={producerPrice || ''} onChange={(e) => setProducerPrice(Number(e.target.value))} placeholder="0" style={{ ...inputStyle, paddingRight: '32px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>€</span>
                </div>
              </div>
              <div>
                <span style={labelStyle}>Payé par le client</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={paidPrice || ''} onChange={(e) => setPaidPrice(Number(e.target.value))} placeholder="0" style={{ ...inputStyle, paddingRight: '32px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>€</span>
                </div>
              </div>
              <div>
                <span style={labelStyle}>Payé au producteur</span>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={producerPaidPrice || ''} onChange={(e) => setProducerPaidPrice(Number(e.target.value))} placeholder="0" style={{ ...inputStyle, paddingRight: '32px' }} />
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>€</span>
                </div>
              </div>
            </div>

            {/* Quick summary */}
            {price > 0 && (
              <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Marge PEG</span>
                  <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700 }}>{(price - producerPrice).toFixed(2)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Reste à payer (client)</span>
                  <span style={{ color: paidPrice >= price ? '#4ade80' : '#fbbf24', fontSize: '13px', fontWeight: 700 }}>{(price - paidPrice).toFixed(2)} €</span>
                </div>
              </div>
            )}

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

        {/* ═══ Step 3: Confirmation ═══ */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiCheck size={24} style={{ color: '#4ade80' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Confirmer la création</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Vérifiez les informations</p>
            </div>

            <div style={{ borderRadius: '14px', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <span style={{ ...labelStyle, marginBottom: '2px' }}>Projet</span>
                  <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: 0 }}>{name || '—'}</p>
                </div>
                <div>
                  <span style={{ ...labelStyle, marginBottom: '2px' }}>Client</span>
                  <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: 0 }}>{selectedCustomer?.label || 'Aucun'}</p>
                </div>
              </div>

              {description && (
                <div>
                  <span style={{ ...labelStyle, marginBottom: '2px' }}>Description</span>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>{description.length > 120 ? description.slice(0, 120) + '...' : description}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prix</span>
                  <p style={{ color: '#4ade80', fontSize: '16px', fontWeight: 700, margin: '2px 0 0' }}>{price} €</p>
                </div>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producteur</span>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600, margin: '2px 0 0' }}>{selectedProducer?.label || 'Aucun'}</p>
                </div>
                <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priorité</span>
                  <p style={{ color: priority === 'high' ? '#f87171' : priority === 'medium' ? '#fbbf24' : '#4ade80', fontSize: '14px', fontWeight: 600, margin: '2px 0 0' }}>
                    {priorityData.find((p: any) => p.value === priority)?.label || priority}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{dayjs(startDate).format('DD/MM/YYYY')}</span>
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px' }}>→</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{dayjs(endDate).format('DD/MM/YYYY')}</span>
                {poolable && <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '4px', background: 'rgba(47,111,237,0.1)', color: '#6fa3f5', fontWeight: 700 }}>POOL</span>}
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
                {loading ? 'Création...' : 'Créer le projet'} <HiCheck size={16} />
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

export default ModalNewProject;
