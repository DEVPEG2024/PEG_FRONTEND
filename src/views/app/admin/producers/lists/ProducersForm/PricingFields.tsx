import Input from '@/components/ui/Input';
import { Controller, useWatch } from 'react-hook-form';
import Select from '@/components/ui/Select';
import Switcher from '@/components/ui/Switcher';

type PricingFieldsProps = {
  control: any;
  errors: any;
};

const PRICE_RANGE_OPTIONS = [
  { value: 'low', label: '💰 Économique' },
  { value: 'medium', label: '💰💰 Intermédiaire' },
  { value: 'premium', label: '💰💰💰 Premium' },
];

const cardWrap: React.CSSProperties = {
  padding: '1.5px',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.12) 100%)',
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

const PricingFields = ({ control, errors }: PricingFieldsProps) => {
  const volumeDiscountAvailable = useWatch({ control, name: 'volumeDiscountAvailable' });

  return (
    <div style={cardWrap}>
      <div style={cardInner}>
        <p style={sectionTitle}>Tarification</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginBottom: '16px', marginTop: '-6px' }}>
          Positionnement tarifaire et conditions de remise.
        </p>

        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Fourchette de prix</p>

        <div style={{ marginBottom: '12px' }}>
          <label style={fieldLabel}>Positionnement</label>
          <Controller
            name="priceRange"
            control={control}
            render={({ field }) => (
              <Select
                field={field}
                options={PRICE_RANGE_OPTIONS}
                placeholder="Choisissez le positionnement"
                value={PRICE_RANGE_OPTIONS.find((o) => o.value === field.value) || null}
                onChange={(option: any) => field.onChange(option?.value || null)}
                isClearable
              />
            )}
          />
        </div>

        <div style={divider} />
        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Remise sur volume</p>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: volumeDiscountAvailable ? '14px' : '0' }}>
            <Controller
              name="volumeDiscountAvailable"
              control={control}
              render={({ field }) => (
                <Switcher
                  checked={!!field.value}
                  onChange={(checked) => field.onChange(checked)}
                />
              )}
            />
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: 500 }}>
              {volumeDiscountAvailable ? 'Remise disponible' : 'Non disponible'}
            </span>
          </div>

          {volumeDiscountAvailable && (
            <div>
              <label style={fieldLabel}>Taux de remise</label>
              <Controller
                name="volumeDiscountRate"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Ex: 10"
                    suffix="%"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                )}
              />
              {errors.volumeDiscountRate && <p style={fieldError}>{errors.volumeDiscountRate.message}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingFields;
