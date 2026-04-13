import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import {
  Controller,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from 'react-hook-form';
import { t } from 'i18next';
import { Select, Switcher } from '@/components/ui';
import { Options, UserFormModel } from '../EditUser';
import { HiOutlineUser, HiOutlineMail, HiOutlineShieldCheck, HiOutlineIdentification } from 'react-icons/hi';

type UserFieldsProps = {
  onEdition: boolean;
  errors: FieldErrors<UserFormModel>;
  customers: Options[];
  producers: Options[];
  roles: Options[];
  control: any;
  watch: UseFormWatch<UserFormModel>;
  setValue: UseFormSetValue<UserFormModel>;
  currentStep?: number;
};

const sectionTitleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '18px',
};

const sectionIconStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.7)',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '6px',
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginBottom: '4px',
};

const UserFields = (props: UserFieldsProps) => {
  const {
    onEdition,
    errors,
    customers,
    producers,
    roles,
    control,
    watch,
    currentStep = 0,
  } = props;
  const values = watch();

  // Step 0: Identity fields (lastName, firstName, email, username)
  if (currentStep === 0) {
    return (
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
          <FormItem
            label={t('lastname')}
            invalid={!!errors.lastName}
            errorMessage={errors.lastName?.message}
          >
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="text"
                  autoComplete="off"
                  placeholder={t('lastname')}
                />
              )}
            />
          </FormItem>
          <FormItem
            label={t('firstname')}
            invalid={!!errors.firstName}
            errorMessage={errors.firstName?.message}
          >
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="text"
                  autoComplete="off"
                  placeholder={t('firstname')}
                />
              )}
            />
          </FormItem>
        </div>

        <div style={{ ...rowStyle, marginTop: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <HiOutlineMail size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email</span>
            </div>
            <FormItem
              label={t('email')}
              invalid={!!errors.email}
              errorMessage={errors.email?.message}
              style={{ marginBottom: 0 }}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    autoComplete="off"
                    placeholder={t('email')}
                  />
                )}
              />
            </FormItem>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <HiOutlineIdentification size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Identifiant</span>
            </div>
            <FormItem
              label={t('username')}
              invalid={!!errors.username}
              errorMessage={errors.username?.message}
              style={{ marginBottom: 0 }}
            >
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    autoComplete="off"
                    placeholder={t('username')}
                  />
                )}
              />
            </FormItem>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Role & Access (role, customer/producer, blocked)
  return (
    <div>
      <div style={sectionTitleStyle}>
        <div style={{ ...sectionIconStyle, background: 'rgba(168,85,247,0.15)' }}>
          <HiOutlineShieldCheck size={16} style={{ color: '#c084fc' }} />
        </div>
        <div>
          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>
            Role & Acces
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>
            Attribution du role et lien client/producteur
          </p>
        </div>
      </div>

      <div style={rowStyle}>
        <FormItem
          label="Role"
          invalid={!!errors.role}
          errorMessage={errors.role?.message}
        >
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                options={roles}
                placeholder="Choisir un role"
                value={roles.find((option) => field.value === option.value)}
                onChange={(selectedOption) => {
                  const value = selectedOption?.value;
                  field.onChange(value);
                }}
              />
            )}
          />
        </FormItem>

        {/* Conditional: customer select */}
        {values.role === roles.find(({ label }) => label === 'customer')?.value && (
          <FormItem
            label="Client"
            invalid={!!errors.customer}
            errorMessage={errors.customer?.message}
          >
            <Controller
              name="customer"
              control={control}
              render={({ field }) => (
                <Select
                  options={customers}
                  placeholder="Choisir un client"
                  value={customers.find((option) => field.value === option.value)}
                  onChange={(selectedOption) => {
                    const value = selectedOption?.value;
                    field.onChange(value);
                  }}
                />
              )}
            />
          </FormItem>
        )}

        {/* Conditional: producer select */}
        {values.role === roles.find(({ label }) => label === 'producer')?.value && (
          <FormItem
            label="Producteur"
            invalid={!!errors.producer}
            errorMessage={errors.producer?.message}
          >
            <Controller
              name="producer"
              control={control}
              render={({ field }) => (
                <Select
                  options={producers}
                  placeholder="Choisir un producteur"
                  value={producers.find((option) => field.value === option.value)}
                  onChange={(selectedOption) => {
                    const value = selectedOption?.value;
                    field.onChange(value);
                  }}
                />
              )}
            />
          </FormItem>
        )}
      </div>

      {/* Blocked / Active toggle */}
      <div style={{
        marginTop: '20px',
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>
            {t('actif')}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '2px 0 0 0' }}>
            Desactiver pour bloquer l'acces de l'utilisateur
          </p>
        </div>
        <Controller
          name="blocked"
          control={control}
          render={({ field }) => (
            <Switcher
              checked={!field.value}
              onChange={(val) => field.onChange(val)}
            />
          )}
        />
      </div>
    </div>
  );
};

export default UserFields;
