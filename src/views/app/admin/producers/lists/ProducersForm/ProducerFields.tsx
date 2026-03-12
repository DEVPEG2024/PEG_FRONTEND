import Input from '@/components/ui/Input';
import { Controller, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { t } from 'i18next';
import { Select } from '@/components/ui';
import { ProducerFormModel } from './ProducerForm';

type country = { label: string; dialCode: string; value: string };

type ProducerFieldsProps = {
  countries: country[];
  errors: FieldErrors<ProducerFormModel>;
  control: any;
  watch: UseFormWatch<ProducerFormModel>;
  setValue: UseFormSetValue<ProducerFormModel>;
};

const cardWrap: React.CSSProperties = {
  padding: '1.5px',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.03) 55%, rgba(255,255,255,0.09) 100%)',
  borderRadius: '17px',
  marginBottom: '16px',
};

const cardInner: React.CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  borderRadius: '16px',
  padding: '20px 22px',
  fontFamily: 'Inter, sans-serif',
};

const sectionTitle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.3)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '14px',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '7px',
};

const fieldError: React.CSSProperties = { color: '#f87171', fontSize: '11px', marginTop: '4px' };

const divider: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.06)',
  margin: '16px 0 14px',
};

const ProducerFields = (props: ProducerFieldsProps) => {
  const { countries, errors, control, watch, setValue } = props;

  const formatPhoneNumber = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  return (
    <div style={cardWrap}>
      <div style={cardInner}>
        <p style={sectionTitle}>{t('p.producer')}</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginBottom: '16px', marginTop: '-6px' }}>
          {t('p.producer_description')}
        </p>

        <div style={{ marginBottom: '12px' }}>
          <label style={fieldLabel}>Nom du producteur *</label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" autoComplete="off" placeholder="Nom du producteur" />
            )}
          />
          {errors.name && <p style={fieldError}>{errors.name.message}</p>}
        </div>

        <div style={divider} />
        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Adresse</p>

        <div style={{ marginBottom: '12px' }}>
          <label style={fieldLabel}>{t('address')} *</label>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" autoComplete="off" placeholder={t('address')} />
            )}
          />
          {errors.address && <p style={fieldError}>{errors.address.message}</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={fieldLabel}>{t('zipCode')} *</label>
            <Controller
              name="zipCode"
              control={control}
              render={({ field }) => (
                <Input {...field} type="text" autoComplete="off" placeholder={t('zipCode')} />
              )}
            />
            {errors.zipCode && <p style={fieldError}>{errors.zipCode.message}</p>}
          </div>
          <div>
            <label style={fieldLabel}>{t('city')} *</label>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Input {...field} type="text" autoComplete="off" placeholder={t('city')} />
              )}
            />
            {errors.city && <p style={fieldError}>{errors.city.message}</p>}
          </div>
          <div>
            <label style={fieldLabel}>{t('country')} *</label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <Select
                  field={field}
                  options={countries}
                  placeholder="Pays"
                  value={countries.filter((c) => c.value === field.value)}
                  onChange={(option) => field.onChange(option?.value)}
                />
              )}
            />
            {errors.country && <p style={fieldError}>{errors.country.message}</p>}
          </div>
        </div>

        <div style={divider} />
        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Contact</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={fieldLabel}>{t('phone')} *</label>
            <Controller
              name="phoneNumber"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="text"
                  autoComplete="off"
                  placeholder="06 00 00 00 00"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    field.onChange(formatPhoneNumber(e.target.value))
                  }
                />
              )}
            />
            {errors.phoneNumber && <p style={fieldError}>{errors.phoneNumber.message}</p>}
          </div>
          <div>
            <label style={fieldLabel}>{t('email')} *</label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input {...field} type="text" autoComplete="off" placeholder={t('email')} />
              )}
            />
            {errors.email && <p style={fieldError}>{errors.email.message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProducerFields;
