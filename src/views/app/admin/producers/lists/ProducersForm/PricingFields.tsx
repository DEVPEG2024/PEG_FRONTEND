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

const PRICE_BADGE: Record<string, { bg: string; border: string; color: string }> = {
  low:     { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)',   color: '#4ade80' },
  medium:  { bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.2)',  color: '#38bdf8' },
  premium: { bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.2)',  color: '#c084fc' },
};

const card: React.CSSProperties = {
  background: 'linear-gradient(160deg, #0b1e18 0%, #061410 100%)',
  border: '1.5px solid rgba(16,185,129,0.2)',
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
  color: 'rgba(16,185,129,0.5)',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '12px',
};

const PricingFields = ({ control, errors }: PricingFieldsProps) => {
  const volumeDiscountAvailable = useWatch({ control, name: 'volumeDiscountAvailable' });
  const priceRange = useWatch({ control, name: 'priceRange' });
  const badge = priceRange ? PRICE_BADGE[priceRange] : null;

  return (
    <div style={card}>
      <p style={{ color: 'rgba(16,185,129,0.8)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
        💶 Tarification
      </p>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginBottom: '16px', marginTop: '-8px' }}>
        Positionnement tarifaire et conditions de remise.
      </p>

      <p style={subLabel}>📈 Positionnement tarifaire</p>

      <label style={fieldLabel}>Fourchette de prix</label>
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

      {badge && (
        <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: '8px', background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: '999px', padding: '3px 12px', color: badge.color, fontSize: '12px', fontWeight: 600 }}>
          {PRICE_RANGE_OPTIONS.find((o) => o.value === priceRange)?.label}
        </div>
      )}

      <div style={divider} />
      <p style={subLabel}>🏷️ Remise sur volume</p>

      <div style={{ background: volumeDiscountAvailable ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${volumeDiscountAvailable ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '14px 16px', transition: 'all 0.2s' }}>
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
          <span style={{ color: volumeDiscountAvailable ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 600, transition: 'color 0.2s' }}>
            {volumeDiscountAvailable ? '✓ Remise disponible' : 'Non disponible'}
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
  );
};

export default PricingFields;
