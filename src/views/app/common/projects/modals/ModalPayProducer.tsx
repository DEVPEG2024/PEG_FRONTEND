import { useState } from 'react';
import { createPortal } from 'react-dom';
import { HiCheck, HiX, HiCurrencyEuro, HiArrowRight, HiArrowLeft } from 'react-icons/hi';
import { Project } from '@/@types/project';
import { useAppDispatch } from '@/store';
import { payProducer, updateProject } from '../store';
import { Transaction } from '@/@types/transaction';
import { paymentProducerProjectTypes } from '../lists/constants';

type PayProducerFormModel = {
  amount: number;
  type: string;
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '12px 14px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

function ModalPayProducer({
  project,
  isPayProducerOpen,
  onClosePayProducer,
}: {
  project: Project;
  isPayProducerOpen: boolean;
  onClosePayProducer: () => void;
}) {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<PayProducerFormModel>({
    amount: project.producerPrice,
    type: 'projectPayment',
  });
  const [step, setStep] = useState(0);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const transaction: Omit<Transaction, 'documentId'> = {
      amount: formData.amount,
      project,
      producer: project.producer!,
      type: formData.type,
      date: new Date(),
      description: '',
    };
    dispatch(payProducer({ project, transaction }));
    dispatch(
      updateProject({
        documentId: project.documentId,
        producerPaidPrice: project.producerPaidPrice + formData.amount,
      })
    );
    handleClose();
  };

  const handleClose = () => {
    setStep(0);
    setFormData({ amount: project.producerPrice, type: 'projectPayment' });
    onClosePayProducer();
  };

  if (!isPayProducerOpen) return null;

  const selectedType = paymentProducerProjectTypes.find((t) => t.value === formData.type);
  const remaining = (project.producerPrice || 0) - (project.producerPaidPrice || 0);

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
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

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '28px' }}>
          {['Montant', 'Confirmation'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: i === step ? '6px 14px' : '6px 10px',
                borderRadius: '100px',
                background: i < step ? 'rgba(34,197,94,0.12)' : i === step ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (i < step ? 'rgba(34,197,94,0.25)' : i === step ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.06)'),
                transition: 'all 0.3s',
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', fontSize: '10px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < step ? '#22c55e' : i === step ? '#2f6fed' : 'rgba(255,255,255,0.08)',
                  color: '#fff',
                }}>
                  {i < step ? <HiCheck size={12} /> : i + 1}
                </div>
                {i === step && <span style={{ fontSize: '11px', fontWeight: 600, color: '#6fa3f5' }}>{label}</span>}
              </div>
              {i < 1 && <div style={{ width: '16px', height: '1px', background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>

        {/* Step 0: Amount & Method */}
        {step === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiCurrencyEuro size={24} style={{ color: '#4ade80' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Payer le producteur</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>{project.producer?.name || 'Producteur'}</p>
            </div>

            {/* Remaining summary */}
            <div style={{ marginBottom: '16px', padding: '14px', borderRadius: '12px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Commission totale</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 700 }}>{project.producerPrice || 0} EUR</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Deja paye</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 700 }}>{project.producerPaidPrice || 0} EUR</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600 }}>Reste a payer</span>
                <span style={{ color: remaining > 0 ? '#fbbf24' : '#4ade80', fontSize: '13px', fontWeight: 700 }}>{remaining.toFixed(2)} EUR</span>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={labelStyle}>Montant</span>
              <div style={{ position: 'relative' }}>
                <input type="number" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} placeholder="0" style={{ ...inputStyle, paddingRight: '40px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>EUR</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span style={labelStyle}>Type de paiement</span>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ ...inputStyle, appearance: 'auto' }}>
                {paymentProducerProjectTypes.map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={handleClose} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
              <button onClick={() => { if (!formData.amount || formData.amount <= 0) return; setStep(1); }} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700,
                cursor: formData.amount > 0 ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif',
                background: formData.amount > 0 ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: formData.amount > 0 ? '0 4px 16px rgba(47,111,237,0.3)' : 'none',
              }}>Suivant <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* Step 1: Confirmation */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiCheck size={24} style={{ color: '#4ade80' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Confirmer le paiement</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Verifiez les informations</p>
            </div>

            <div style={{ borderRadius: '14px', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <span style={{ ...labelStyle, marginBottom: '2px' }}>Producteur</span>
                  <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: 0 }}>{project.producer?.name || '--'}</p>
                </div>
                <div>
                  <span style={{ ...labelStyle, marginBottom: '2px' }}>Projet</span>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600, margin: 0 }}>{project.name || '--'}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)', textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Montant</span>
                  <p style={{ color: '#4ade80', fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>{formData.amount} EUR</p>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, margin: '4px 0 0' }}>{selectedType?.label || formData.type}</p>
                </div>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Apres ce paiement, le producteur aura recu </span>
                <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 700 }}>{((project.producerPaidPrice || 0) + formData.amount).toFixed(2)} EUR</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}> sur {project.producerPrice || 0} EUR</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button onClick={() => setStep(0)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiArrowLeft size={14} /> Modifier
              </button>
              <button onClick={handleSubmit} style={{
                padding: '12px 28px', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
              }}>
                Confirmer le paiement <HiCheck size={16} />
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>
      </div>
    </div>,
    document.body
  );
}

export default ModalPayProducer;
