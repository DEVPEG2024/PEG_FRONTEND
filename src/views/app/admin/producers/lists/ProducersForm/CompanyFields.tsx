import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Controller, FieldErrors } from 'react-hook-form';
import { t } from 'i18next';
import { Options } from '../EditProducer';

type FormFieldsName = {
  producerCategory: string;
  vatNumber: string;
  siretNumber: string;
  website: string;
};

type CompanyFieldsProps = {
  producerCategories: Options[];
  control: any;
  errors: FieldErrors<FormFieldsName>;
  watch: any;
};

const card: React.CSSProperties = {
  background: 'linear-gradient(160deg, #1a1535 0%, #110f28 100%)',
  border: '1.5px solid rgba(139,92,246,0.2)',
  borderRadius: '16px',
  padding: '20px 22px',
  marginBottom: '16px',
  fontFamily: 'Inter, sans-serif',
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

const fieldError: React.CSSProperties = {
  color: '#f87171',
  fontSize: '11px',
  marginTop: '4px',
};

const divider: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.06)',
  margin: '16px 0 14px',
};

const subLabel: React.CSSProperties = {
  color: 'rgba(167,139,250,0.5)',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '12px',
};

const CompanyFields = (props: CompanyFieldsProps) => {
  const { producerCategories, errors, control, watch } = props;

  return (
    <div style={card}>
      <p style={{ color: 'rgba(167,139,250,0.8)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
        🏢 {t('p.organization')}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginBottom: '16px', marginTop: '-8px' }}>
        {t('p.organization_description')}
      </p>

      <label style={fieldLabel}>Catégorie *</label>
      <Controller
        name="producerCategory"
        control={control}
        render={({ field }) => (
          <Select
            field={field}
            options={producerCategories}
            placeholder="Choisissez la catégorie"
            value={producerCategories.find((o) => field.value === o.value)}
            onChange={(option) => field.onChange(option?.value)}
          />
        )}
      />
      {errors.producerCategory && <p style={fieldError}>{errors.producerCategory.message}</p>}

      <div style={divider} />
      <p style={subLabel}>🪪 Informations légales</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={fieldLabel}>N° TVA *</label>
          <Controller
            name="vatNumber"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" autoComplete="off" placeholder="FR 00 000 000 000" />
            )}
          />
          {errors.vatNumber && <p style={fieldError}>{errors.vatNumber.message}</p>}
        </div>
        <div>
          <label style={fieldLabel}>N° SIRET *</label>
          <Controller
            name="siretNumber"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" autoComplete="off" placeholder="000 000 000 00000" />
            )}
          />
          {errors.siretNumber && <p style={fieldError}>{errors.siretNumber.message}</p>}
        </div>
      </div>

      <div style={divider} />
      <p style={subLabel}>🌐 Présence en ligne</p>

      <label style={fieldLabel}>Site internet</label>
      <Controller
        name="website"
        control={control}
        render={({ field }) => (
          <Input {...field} type="text" autoComplete="off" placeholder="https://www.exemple.fr" />
        )}
      />
      {errors.website && <p style={fieldError}>{errors.website.message}</p>}
    </div>
  );
};

export default CompanyFields;
