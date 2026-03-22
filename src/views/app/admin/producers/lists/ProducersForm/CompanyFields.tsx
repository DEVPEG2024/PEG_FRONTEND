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

const cardWrap: React.CSSProperties = {
  padding: '1.5px',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.12) 100%)',
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
  color: 'rgba(255,255,255,0.55)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '14px',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.6)',
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

const CompanyFields = (props: CompanyFieldsProps) => {
  const { producerCategories, errors, control } = props;

  return (
    <div style={cardWrap}>
      <div style={cardInner}>
        <p style={sectionTitle}>{t('p.organization')}</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginBottom: '16px', marginTop: '-6px' }}>
          {t('p.organization_description')}
        </p>

        <div style={{ marginBottom: '12px' }}>
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
        </div>

        <div style={divider} />
        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Informations légales</p>

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
        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Présence en ligne</p>

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
    </div>
  );
};

export default CompanyFields;
