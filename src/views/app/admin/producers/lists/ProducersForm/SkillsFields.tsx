import Input from '@/components/ui/Input';
import { Controller } from 'react-hook-form';
import Select from '@/components/ui/Select';
import CreatableSelect from 'react-select/creatable';
import { Options } from '../EditProducer';

type SkillsFieldsProps = {
  control: any;
  errors: any;
  productCategoryOptions: Options[];
};

const CERTIFICATION_OPTIONS = [
  { value: 'ISO 9001', label: 'ISO 9001' },
  { value: 'ISO 14001', label: 'ISO 14001' },
  { value: 'ISO 45001', label: 'ISO 45001' },
  { value: 'Bio', label: 'Bio' },
  { value: 'Made in France', label: 'Made in France' },
  { value: 'OEKO-TEX', label: 'OEKO-TEX' },
  { value: 'GOTS', label: 'GOTS' },
  { value: 'Fair Trade', label: 'Fair Trade' },
  { value: 'B Corp', label: 'B Corp' },
  { value: 'NF', label: 'NF' },
  { value: 'CE', label: 'CE' },
  { value: 'FSC', label: 'FSC' },
];

const cardWrap: React.CSSProperties = {
  padding: '1.5px',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.1) 100%)',
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

const divider: React.CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.06)',
  margin: '16px 0 14px',
};

const SkillsFields = ({ control, errors, productCategoryOptions }: SkillsFieldsProps) => {
  return (
    <div style={cardWrap}>
      <div style={cardInner}>
        <p style={sectionTitle}>Compétences & Spécialités</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginBottom: '16px', marginTop: '-6px' }}>
          Définissez les domaines d'expertise et les labels du producteur.
        </p>

        <div style={{ marginBottom: '12px' }}>
          <label style={fieldLabel}>Catégories de produits maîtrisées</label>
          <Controller
            name="productCategories"
            control={control}
            render={({ field }) => (
              <Select
                isMulti
                field={field}
                value={(field.value || []).map((v: string) =>
                  productCategoryOptions.find((opt) => opt.value === v) || { value: v, label: v }
                )}
                onChange={(options: any) =>
                  field.onChange(options ? options.map((o: any) => o.value) : [])
                }
                options={productCategoryOptions}
                placeholder="Sélectionner des catégories..."
                noOptionsMessage={() => 'Aucune catégorie disponible'}
              />
            )}
          />
        </div>

        <div style={divider} />
        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Forces & Faiblesses</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={fieldLabel}>Points forts</label>
            <Controller
              name="strengths"
              control={control}
              render={({ field }) => (
                <Input {...field} textArea rows={3} placeholder="Réactivité, qualité premium..." />
              )}
            />
          </div>
          <div>
            <label style={fieldLabel}>Points faibles</label>
            <Controller
              name="weaknesses"
              control={control}
              render={({ field }) => (
                <Input {...field} textArea rows={3} placeholder="Délais longs, MOQ élevé..." />
              )}
            />
          </div>
        </div>

        <div style={divider} />
        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Certifications & Labels</p>

        <Controller
          name="certifications"
          control={control}
          render={({ field }) => (
            <Select
              isMulti
              componentAs={CreatableSelect}
              field={field}
              options={CERTIFICATION_OPTIONS}
              value={(field.value || []).map((v: string) => ({ value: v, label: v }))}
              onChange={(options: any) =>
                field.onChange(options ? options.map((o: any) => o.value) : [])
              }
              placeholder="ISO, Bio, Made in France..."
            />
          )}
        />
      </div>
    </div>
  );
};

export default SkillsFields;
