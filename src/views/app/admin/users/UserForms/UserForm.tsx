import { FormContainer } from '@/components/ui/Form';
import { FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import { AiOutlineSave } from 'react-icons/ai';
import { HiArrowRight, HiArrowLeft, HiCheck, HiOutlineUserCircle, HiOutlineUser, HiOutlineMail, HiOutlineShieldCheck, HiOutlineIdentification } from 'react-icons/hi';
import { t } from 'i18next';
import { Options, UserFormModel } from '../EditUser';
import { Container } from '@/components/shared';
import { useState } from 'react';
import { Select, Switcher } from '@/components/ui';

export type SetSubmitting = React.Dispatch<React.SetStateAction<boolean>>;

const STEP_LABELS = ['Identite', 'Role & Acces'];

type UserFormProps = {
  initialData?: UserFormModel;
  onEdition: boolean;
  onDiscard?: () => void;
  onFormSubmit: (formData: UserFormModel) => void;
  customers: Options[];
  producers: Options[];
  roles: Options[];
};

const UserForm = (props: UserFormProps) => {
  const {
    onEdition,
    initialData,
    onFormSubmit,
    onDiscard,
    customers,
    producers,
    roles,
  } = props;

  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const totalSteps = STEP_LABELS.length;

  const [form, setForm] = useState<UserFormModel>({
    documentId: initialData?.documentId || '',
    lastName: initialData?.lastName || '',
    firstName: initialData?.firstName || '',
    email: initialData?.email || '',
    username: initialData?.username || '',
    role: initialData?.role || '',
    customer: initialData?.customer || '',
    producer: initialData?.producer || '',
    blocked: initialData?.blocked || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (name: keyof UserFormModel, value: any) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 0) {
      if (!form.lastName?.trim()) errs.lastName = t('cust.error.lastName');
      if (!form.firstName?.trim()) errs.firstName = t('cust.error.firstName');
      if (!form.email?.trim()) errs.email = t('cust.error.email');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = t('cust.error.invalidEmail');
      if (!form.username?.trim()) errs.username = t('cust.error.username');
    }

    if (step === 1) {
      if (!form.role) errs.role = t('cust.error.role');
    }

    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(0)) { setCurrentStep(0); return; }
    if (!validateStep(1)) { setCurrentStep(1); return; }
    setSubmitting(true);
    try {
      await onFormSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const rowStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '4px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px',
  };

  const sectionIconStyle: React.CSSProperties = {
    width: '32px', height: '32px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif', maxWidth: '720px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ paddingTop: '28px', paddingBottom: '20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Administration
        </p>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HiOutlineUserCircle size={24} style={{ color: '#6b9eff' }} />
          {onEdition ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        </h2>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" onClick={() => {
              if (i > currentStep && !validateStep(currentStep)) return;
              setCurrentStep(i);
            }} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: i === currentStep ? '7px 16px' : '7px 12px',
              borderRadius: '100px', border: 'none', cursor: 'pointer',
              background: i < currentStep ? 'rgba(34,197,94,0.12)' : i === currentStep ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.04)',
              transition: 'all 0.25s',
            }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < currentStep ? '#22c55e' : i === currentStep ? '#2f6fed' : 'rgba(255,255,255,0.08)',
                color: '#fff', transition: 'all 0.25s',
              }}>
                {i < currentStep ? <HiCheck size={12} /> : i + 1}
              </div>
              <span style={{
                fontSize: '12px', fontWeight: 600,
                color: i < currentStep ? '#4ade80' : i === currentStep ? '#6fa3f5' : 'rgba(255,255,255,0.35)',
              }}>{label}</span>
            </button>
            {i < totalSteps - 1 && <div style={{ width: '28px', height: '1px', background: 'rgba(255,255,255,0.08)' }} />}
          </div>
        ))}
      </div>

      <FormContainer>
        {/* Card container */}
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          border: '1.5px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '24px 28px',
        }}>
          {currentStep === 0 && (
            <div>
              <div style={sectionTitleStyle}>
                <div style={{ ...sectionIconStyle, background: 'rgba(47,111,237,0.15)' }}>
                  <HiOutlineUser size={16} style={{ color: '#6b9eff' }} />
                </div>
                <div>
                  <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>
                    {onEdition ? 'Modifier l\'identite' : 'Informations d\'identite'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>
                    Nom, prenom, email et identifiant
                  </p>
                </div>
              </div>

              <div style={rowStyle}>
                <FormItem label={t('lastname')} invalid={!!errors.lastName} errorMessage={errors.lastName}>
                  <Input
                    type="text"
                    autoComplete="off"
                    placeholder={t('lastname')}
                    value={form.lastName}
                    onChange={(e: any) => updateField('lastName', e.target.value)}
                  />
                </FormItem>
                <FormItem label={t('firstname')} invalid={!!errors.firstName} errorMessage={errors.firstName}>
                  <Input
                    type="text"
                    autoComplete="off"
                    placeholder={t('firstname')}
                    value={form.firstName}
                    onChange={(e: any) => updateField('firstName', e.target.value)}
                  />
                </FormItem>
              </div>

              <div style={{ ...rowStyle, marginTop: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <HiOutlineMail size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email</span>
                  </div>
                  <FormItem label={t('email')} invalid={!!errors.email} errorMessage={errors.email} style={{ marginBottom: 0 }}>
                    <Input
                      type="text"
                      autoComplete="off"
                      placeholder={t('email')}
                      value={form.email}
                      onChange={(e: any) => updateField('email', e.target.value)}
                    />
                  </FormItem>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <HiOutlineIdentification size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Identifiant</span>
                  </div>
                  <FormItem label={t('username')} invalid={!!errors.username} errorMessage={errors.username} style={{ marginBottom: 0 }}>
                    <Input
                      type="text"
                      autoComplete="off"
                      placeholder={t('username')}
                      value={form.username}
                      onChange={(e: any) => updateField('username', e.target.value)}
                    />
                  </FormItem>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <div style={sectionTitleStyle}>
                <div style={{ ...sectionIconStyle, background: 'rgba(168,85,247,0.15)' }}>
                  <HiOutlineShieldCheck size={16} style={{ color: '#c084fc' }} />
                </div>
                <div>
                  <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>Role & Acces</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>
                    Attribution du role et lien client/producteur
                  </p>
                </div>
              </div>

              <div style={rowStyle}>
                <FormItem label="Role" invalid={!!errors.role} errorMessage={errors.role}>
                  <Select
                    options={roles}
                    placeholder="Choisir un role"
                    value={roles.find((o) => form.role === o.value)}
                    onChange={(opt: any) => updateField('role', opt?.value || '')}
                  />
                </FormItem>

                {form.role === roles.find(({ label }) => label === 'customer')?.value && (
                  <FormItem label="Client">
                    <Select
                      options={customers}
                      placeholder="Choisir un client"
                      value={customers.find((o) => form.customer === o.value)}
                      onChange={(opt: any) => updateField('customer', opt?.value || '')}
                    />
                  </FormItem>
                )}

                {form.role === roles.find(({ label }) => label === 'producer')?.value && (
                  <FormItem label="Producteur">
                    <Select
                      options={producers}
                      placeholder="Choisir un producteur"
                      value={producers.find((o) => form.producer === o.value)}
                      onChange={(opt: any) => updateField('producer', opt?.value || '')}
                    />
                  </FormItem>
                )}
              </div>

              <div style={{
                marginTop: '20px', padding: '16px 20px',
                background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>{t('actif')}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '2px 0 0 0' }}>
                    Desactiver pour bloquer l'acces de l'utilisateur
                  </p>
                </div>
                <Switcher
                  checked={!form.blocked}
                  onChange={(val: boolean) => updateField('blocked', !val)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '10px',
          padding: '20px 0 8px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '16px',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => onDiscard?.()} style={{
              padding: '10px 20px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
              color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
              {t('cancel')}
            </button>
            {currentStep > 0 && (
              <button type="button" onClick={() => setCurrentStep((s) => s - 1)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                <HiArrowLeft size={14} /> Retour
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep < totalSteps - 1 ? (
              <button type="button" onClick={handleNext} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 22px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px',
                fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(47,111,237,0.35)', fontFamily: 'Inter, sans-serif',
              }}>
                Suivant <HiArrowRight size={14} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '10px 22px',
                background: submitting ? 'rgba(34,197,94,0.4)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px',
                fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 4px 14px rgba(34,197,94,0.35)',
                fontFamily: 'Inter, sans-serif',
              }}>
                <AiOutlineSave size={15} />
                {submitting ? 'Enregistrement...' : t('save')}
              </button>
            )}
          </div>
        </div>
      </FormContainer>
    </Container>
  );
};

export default UserForm;
