import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormContainer } from '@/components/ui/Form';
import UserFields from './UserFields';
import cloneDeep from 'lodash/cloneDeep';
import { AiOutlineSave } from 'react-icons/ai';
import { HiArrowRight, HiArrowLeft, HiCheck, HiOutlineUserCircle } from 'react-icons/hi';
import * as Yup from 'yup';
import { t } from 'i18next';
import { Options, UserFormModel } from '../EditUser';
import { Container } from '@/components/shared';
import { useState } from 'react';

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

const validationSchema = Yup.object().shape({
  username: Yup.string().required(t('cust.error.username')),
  lastName: Yup.string().required(t('cust.error.lastName')),
  firstName: Yup.string().required(t('cust.error.firstName')),
  email: Yup.string()
    .email(t('cust.error.invalidEmail'))
    .required(t('cust.error.email')),
  role: Yup.string().required(t('cust.error.role')),
});

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
  const totalSteps = STEP_LABELS.length;

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<UserFormModel>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: initialData,
    mode: 'onTouched',
  });

  const STEP_FIELDS: (keyof UserFormModel)[][] = [
    ['lastName', 'firstName', 'email', 'username'],
    ['role'],
  ];

  const handleNext = async () => {
    const valid = await trigger(STEP_FIELDS[currentStep]);
    if (valid) setCurrentStep((s) => s + 1);
  };

  const onSubmit = async (values: UserFormModel) => {
    const formData = cloneDeep(values);
    onFormSubmit(formData);
  };

  const onError = () => {
    // Find the first step with an error and navigate to it
    for (let i = 0; i < STEP_FIELDS.length; i++) {
      if (STEP_FIELDS[i].some((f) => errors[f])) {
        setCurrentStep(i);
        break;
      }
    }
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
            <button type="button" onClick={async () => {
              if (i > currentStep) {
                const valid = await trigger(STEP_FIELDS[currentStep]);
                if (!valid) return;
              }
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

      <form onSubmit={handleSubmit(onSubmit, onError)}>
        <FormContainer>
          {/* Card container */}
          <div style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            border: '1.5px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '24px 28px',
          }}>
            <UserFields
              onEdition={onEdition}
              errors={errors}
              customers={customers}
              producers={producers}
              roles={roles}
              control={control}
              watch={watch}
              setValue={setValue}
              currentStep={currentStep}
            />
          </div>

          {/* Footer with step navigation */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', gap: '10px',
            padding: '20px 0 8px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '16px',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onDiscard?.()}
                style={{
                  padding: '10px 20px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                {t('cancel')}
              </button>
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => s - 1)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 18px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                    color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <HiArrowLeft size={14} /> Retour
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {currentStep < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 22px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                    border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px',
                    fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(47,111,237,0.35)', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Suivant <HiArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '10px 22px',
                    background: isSubmitting ? 'rgba(34,197,94,0.4)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                    border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px',
                    fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(34,197,94,0.35)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <AiOutlineSave size={15} />
                  {isSubmitting ? 'Enregistrement...' : t('save')}
                </button>
              )}
            </div>
          </div>
        </FormContainer>
      </form>
    </Container>
  );
};

export default UserForm;
