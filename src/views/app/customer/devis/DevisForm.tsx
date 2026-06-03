import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { toast } from 'react-toastify';
import { TbSparkles, TbArrowLeft, TbCheck } from 'react-icons/tb';
import { apiCreateQuote } from '@/services/QuoteServices';
import { unwrapData } from '@/utils/serviceHelper';
import { User } from '@/@types/user';

const PURPLE = '#8b5cf6';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '11px 14px',
  color: '#fff',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.55)',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '6px',
};

const PROJECT_TYPES = [
  'Vêtement personnalisé',
  'Signalétique & PLV',
  'Objet personnalisé',
  'Print',
  'Conception graphique',
  'Football',
  'Photo & vidéo',
  'Autre',
];

const DevisForm = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user.user) as User | undefined;
  const ci = user?.customer?.companyInformations;

  // Le devis est automatiquement rattaché au profil connecté (non modifiable)
  const company = user?.customer?.name ?? '';
  const contact = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const email = user?.email ?? ci?.email ?? '';
  const phone = ci?.phoneNumber ?? '';

  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const [quantity, setQuantity] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) { toast.error('Merci de décrire votre projet'); return; }
    setSending(true);
    try {
      await unwrapData(apiCreateQuote({
        title: `${company || contact || 'Client'} — ${projectType}`,
        status: 'requested',
        projectType,
        quantity: quantity.trim() || undefined,
        description: description.trim(),
        desiredDeadline: deadline || null,
        requestedByName: contact || null,
        requestedByEmail: email || null,
        requestedByPhone: phone || null,
        customer: user?.customer?.documentId || null,
      }));
      setDone(true);
      toast.success('Votre demande de devis a bien été envoyée');
    } catch (e) {
      toast.error("Échec de l'envoi. Réessayez ou contactez-nous.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: '640px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 20px',
          background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TbCheck size={32} color="#34d399" />
        </div>
        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: '0 0 10px' }}>Demande envoyée !</h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', margin: '0 0 28px', lineHeight: 1.5 }}>
          Merci, notre équipe revient vers vous au plus vite pour votre projet sur-mesure.
        </p>
        <button onClick={() => navigate('/customer/catalogue')} style={{
          background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: '12px',
          padding: '12px 28px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
        }}>
          Retour au catalogue
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: '760px', margin: '0 auto', padding: '24px 20px 48px' }}>
      <button onClick={() => navigate(-1)} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        fontFamily: 'Inter, sans-serif', marginBottom: '20px', padding: 0,
      }}>
        <TbArrowLeft size={16} /> Retour
      </button>

      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TbSparkles size={22} color="#a78bfa" />
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Demander un devis</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '2px 0 0' }}>
            Décrivez votre projet sur-mesure, notre équipe vous recontacte.
          </p>
        </div>
      </div>

      <div style={{
        marginTop: '24px',
        background: 'linear-gradient(160deg, rgba(22,28,43,0.95), rgba(13,16,24,0.95))',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        {/* Demande rattachée automatiquement au profil connecté */}
        <div style={{
          background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: '10px', padding: '12px 14px',
        }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            Demande pour
          </p>
          <p style={{ margin: '4px 0 0', color: '#fff', fontSize: '14px', fontWeight: 700 }}>
            {company || contact || 'Votre profil'}
          </p>
          {(contact || email) && (
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
              {[contact, email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Projet */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Type de projet</label>
            <select style={{ ...inputStyle, appearance: 'auto' }} value={projectType} onChange={(e) => setProjectType(e.target.value)}>
              {PROJECT_TYPES.map((t) => <option key={t} value={t} style={{ color: '#000' }}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Quantité estimée</label>
            <input style={inputStyle} value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="ex. 100 pièces" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Délai souhaité</label>
          <input style={inputStyle} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>

        <div>
          <label style={labelStyle}>Description du projet *</label>
          <textarea
            style={{ ...inputStyle, minHeight: '120px', resize: 'vertical', lineHeight: 1.5 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre besoin : produits, personnalisation, contraintes, références…"
          />
        </div>

        <button onClick={handleSubmit} disabled={sending} style={{
          marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: '12px',
          padding: '14px', color: '#fff', fontSize: '15px', fontWeight: 700,
          cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.7 : 1,
          fontFamily: 'Inter, sans-serif', boxShadow: `0 6px 20px ${PURPLE}55`,
        }}>
          <TbSparkles size={18} />
          {sending ? 'Envoi…' : 'Envoyer ma demande de devis'}
        </button>
      </div>
    </div>
  );
};

export default DevisForm;
