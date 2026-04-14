import { useState, useRef, useEffect } from 'react';
import { HiArrowRight, HiArrowLeft, HiCheck, HiX, HiPhotograph, HiUser, HiOfficeBuilding, HiGlobe, HiPhone, HiMail, HiLocationMarker } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { useAppDispatch } from '@/store';
import { createCustomer, updateCustomer } from '../store';
import { countries } from '@/constants/countries.constant';
import { apiGetCustomerCategories } from '@/services/CustomerCategoryServices';
import { env } from '@/configs/env.config';

type CategoryOption = { label: string; value: string };

type Props = {
  open: boolean;
  onClose: () => void;
  /** Pass a customer object to open in edit mode */
  customer?: any;
};

const resolveUrl = (url: string) => url?.startsWith('http') ? url : (env?.API_ENDPOINT_URL ?? '') + url;

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '12px 14px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
};
const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: 'auto' as any,
};

const StepDot = ({ current, total }: { current: number; total: number }) => (
  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        width: i === current ? '32px' : '8px', height: '8px', borderRadius: '100px',
        background: i < current ? '#22c55e' : i === current ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.08)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: i === current ? '0 0 10px rgba(47,111,237,0.4)' : 'none',
      }} />
    ))}
  </div>
);

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  value ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{icon}</div>
      <div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '2px 0 0' }}>{value}</p>
      </div>
    </div>
  ) : null
);

const CustomerWizard = ({ open, onClose, customer }: Props) => {
  const dispatch = useAppDispatch();
  const isEdit = !!customer;

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Step 0: Identité
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Step 1: Entreprise
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('France');
  const [vatNumber, setVatNumber] = useState('');
  const [siretNumber, setSiretNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [deferredPayment, setDeferredPayment] = useState(false);
  const [catalogAccess, setCatalogAccess] = useState(true);
  const [customerCategory, setCustomerCategory] = useState('');

  // Load categories on mount
  useEffect(() => {
    if (!open) return;
    apiGetCustomerCategories().then((res: any) => {
      const nodes = res?.data?.data?.customerCategories_connection?.nodes ?? [];
      setCategories(nodes.map((c: any) => ({ label: c.name, value: c.documentId })));
    }).catch(() => {});
  }, [open]);

  // Populate fields when opening in edit mode
  useEffect(() => {
    if (!open) return;
    if (customer) {
      const ci = customer.companyInformations ?? {};
      setName(customer.name ?? '');
      setEmail(ci.email ?? '');
      setPhone(ci.phoneNumber ?? '');
      setAddress(ci.address ?? '');
      setZipCode(ci.zipCode ?? '');
      setCity(ci.city ?? '');
      setCountry(ci.country || 'France');
      setVatNumber(ci.vatNumber ?? '');
      setSiretNumber(ci.siretNumber ?? '');
      setWebsite(ci.website ?? '');
      setDeferredPayment(customer.deferredPayment ?? false);
      setCatalogAccess(customer.catalogAccess ?? true);
      setCustomerCategory(customer.customerCategory?.documentId ?? '');
      setLogoFile(null);
      setLogoPreview(customer.logo?.url ? resolveUrl(customer.logo.url) : null);
      setStep(0);
    } else {
      resetFields();
    }
  }, [open, customer]);

  const resetFields = () => {
    setStep(0); setName(''); setEmail(''); setPhone('');
    setLogoFile(null); setLogoPreview(null);
    setAddress(''); setZipCode(''); setCity(''); setCountry('France');
    setVatNumber(''); setSiretNumber(''); setWebsite('');
    setDeferredPayment(false); setCatalogAccess(true); setCustomerCategory('');
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
    setTimeout(() => { e.target.value = ''; }, 100);
  };

  const buildPayload = () => ({
    data: {
      name: name.trim(),
      companyInformations: {
        email: email.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
        address: address.trim() || undefined,
        zipCode: zipCode.trim() || undefined,
        city: city.trim() || undefined,
        country: country || undefined,
        vatNumber: vatNumber.trim() || undefined,
        siretNumber: siretNumber.trim() || undefined,
        website: website.trim() || undefined,
      },
      deferredPayment,
      catalogAccess,
      customerCategory: customerCategory || null,
    },
    logoFile,
  });

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Nom obligatoire'); return; }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        const docId = customer.documentId ?? customer.id;
        await dispatch(updateCustomer({ id: docId, data: payload.data, logoFile: payload.logoFile }));
        toast.success('Client "' + name.trim() + '" mis à jour');
      } else {
        await dispatch(createCustomer(payload));
        toast.success('Client "' + name.trim() + '" créé');
      }
      handleClose();
    } catch {
      toast.error('Erreur lors de ' + (isEdit ? 'la mise à jour' : 'la création'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const isFrance = country === 'France' || country === 'FR';
  const categoryName = categories.find(c => c.value === customerCategory)?.label;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
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

        <StepDot current={step} total={3} />

        {/* ═══ Step 0: Identité ═══ */}
        {step === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(47,111,237,0.2), rgba(47,111,237,0.05))', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiUser size={24} style={{ color: '#6fa3f5' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                {isEdit ? 'Modifier le client' : 'Nouveau client'}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Nom, contact et logo</p>
            </div>

            {/* Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={handleLogoChange} />
              <div onClick={() => logoRef.current?.click()} style={{
                width: '80px', height: '80px', borderRadius: '16px', cursor: 'pointer',
                background: logoPreview ? 'transparent' : 'rgba(255,255,255,0.04)',
                border: '2px dashed ' + (logoPreview ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', transition: 'border-color 0.2s',
              }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <HiPhotograph size={24} style={{ color: 'rgba(255,255,255,0.15)' }} />
                )}
              </div>
            </div>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginBottom: '16px' }}>
              {logoPreview ? 'Cliquez pour changer' : 'Cliquez pour ajouter un logo'}
            </p>

            <div style={{ marginBottom: '12px' }}>
              <span style={labelStyle}>Nom du client *</span>
              <input type="text" placeholder="Ex: Boulangerie Martin" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <span style={labelStyle}>Email</span>
                <input type="email" placeholder="contact@..." value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>T&eacute;l&eacute;phone</span>
                <input type="tel" placeholder="+33..." value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={handleClose} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
              <button onClick={() => { if (!name.trim()) { toast.error('Nom obligatoire'); return; } setStep(1); }} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif',
                background: name.trim() ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: '6px', boxShadow: name.trim() ? '0 4px 16px rgba(47,111,237,0.3)' : 'none',
              }}>Suivant <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ═══ Step 1: Entreprise ═══ */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05))', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiOfficeBuilding size={24} style={{ color: '#c084fc' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Informations entreprise</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Adresse, TVA et options</p>
            </div>

            {/* Catégorie */}
            {categories.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <span style={labelStyle}>Cat&eacute;gorie</span>
                <select value={customerCategory} onChange={(e) => setCustomerCategory(e.target.value)} style={selectStyle}>
                  <option value="">— Aucune —</option>
                  {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <span style={labelStyle}>Adresse</span>
              <input type="text" placeholder="12 rue de la Paix" value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <span style={labelStyle}>Code postal</span>
                <input type="text" placeholder="74000" value={zipCode} onChange={(e) => setZipCode(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Ville</span>
                <input type="text" placeholder="Annecy" value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <span style={labelStyle}>Pays</span>
                <select value={country} onChange={(e) => setCountry(e.target.value)} style={selectStyle}>
                  {countries.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isFrance ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <span style={labelStyle}>{isFrance ? 'N\u00b0 TVA intracom.' : 'N\u00b0 identification fiscale'}</span>
                <input type="text" placeholder="FR..." value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} style={inputStyle} />
              </div>
              {isFrance && (
                <div>
                  <span style={labelStyle}>SIRET</span>
                  <input type="text" placeholder="123 456 789 00012" value={siretNumber} onChange={(e) => setSiretNumber(e.target.value)} style={inputStyle} />
                </div>
              )}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={labelStyle}>Site web</span>
              <input type="url" placeholder="https://..." value={website} onChange={(e) => setWebsite(e.target.value)} style={inputStyle} />
            </div>

            {/* Options */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={deferredPayment} onChange={() => setDeferredPayment(!deferredPayment)} style={{ width: '16px', height: '16px', accentColor: '#a855f7' }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>Paiement diff&eacute;r&eacute;</span>
                </label>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={catalogAccess} onChange={() => setCatalogAccess(!catalogAccess)} style={{ width: '16px', height: '16px', accentColor: '#22c55e' }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>Acc&egrave;s catalogue</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setStep(0)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiArrowLeft size={14} /> Retour
              </button>
              <button onClick={() => setStep(2)} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 16px rgba(47,111,237,0.3)',
              }}>Suivant <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ═══ Step 2: Confirmation ═══ */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiCheck size={24} style={{ color: '#4ade80' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                {isEdit ? 'Confirmer les modifications' : 'Confirmer la cr\u00e9ation'}
              </h3>
            </div>

            <div style={{ borderRadius: '14px', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Header: logo + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="" style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                ) : (
                  <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(47,111,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#6fa3f5', fontWeight: 700, fontSize: '18px' }}>{name.trim()[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>{name}</p>
                  {categoryName && (
                    <span style={{ background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)', borderRadius: '100px', padding: '1px 8px', color: '#6b9eff', fontSize: '11px', fontWeight: 600, marginTop: '4px', display: 'inline-block' }}>
                      {categoryName}
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                <InfoRow icon={<HiMail size={14} />} label="Email" value={email} />
                <InfoRow icon={<HiPhone size={14} />} label="T\u00e9l\u00e9phone" value={phone} />
                <InfoRow icon={<HiLocationMarker size={14} />} label="Adresse" value={[address, zipCode, city].filter(Boolean).join(', ')} />
                <InfoRow icon={<HiGlobe size={14} />} label="Pays" value={country} />
                <InfoRow icon={<HiGlobe size={14} />} label="Site web" value={website} />
                {vatNumber && <InfoRow icon={<HiOfficeBuilding size={14} />} label="TVA" value={vatNumber} />}
                {siretNumber && <InfoRow icon={<HiOfficeBuilding size={14} />} label="SIRET" value={siretNumber} />}
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {deferredPayment && (
                  <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '100px', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc', fontWeight: 700 }}>PAIEMENT DIFF&Eacute;R&Eacute;</span>
                )}
                {catalogAccess ? (
                  <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '100px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontWeight: 700 }}>ACC&Egrave;S CATALOGUE</span>
                ) : (
                  <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '100px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontWeight: 700 }}>SANS CATALOGUE</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiArrowLeft size={14} /> Modifier
              </button>
              <button onClick={handleSubmit} disabled={submitting} style={{
                padding: '12px 28px', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                background: submitting ? 'rgba(255,255,255,0.05)' : isEdit ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: submitting ? 'none' : isEdit ? '0 4px 20px rgba(47,111,237,0.4)' : '0 4px 20px rgba(34,197,94,0.4)',
              }}>
                {submitting ? (isEdit ? 'Mise \u00e0 jour...' : 'Cr\u00e9ation...') : (isEdit ? 'Enregistrer' : 'Cr\u00e9er le client')} <HiCheck size={16} />
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
};

export default CustomerWizard;
