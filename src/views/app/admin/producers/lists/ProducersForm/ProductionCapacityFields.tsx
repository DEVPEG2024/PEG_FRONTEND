import Input from '@/components/ui/Input';
import { Controller } from 'react-hook-form';
import Select from '@/components/ui/Select';

type ProductionCapacityFieldsProps = {
  control: any;
  errors: any;
};

const DELIVERY_ZONE_OPTIONS = [
  { value: 'regional', label: '📍 Régionale' },
  { value: 'national', label: '🇫🇷 Nationale' },
  { value: 'international', label: '🌍 Internationale' },
];

const card: React.CSSProperties = {
  background: 'linear-gradient(160deg, #0c1e30 0%, #071422 100%)',
  border: '1.5px solid rgba(56,189,248,0.2)',
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
  color: 'rgba(56,189,248,0.5)',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '12px',
};

const ProductionCapacityFields = ({ control, errors }: ProductionCapacityFieldsProps) => {
  return (
    <div style={card}>
      <p style={{ color: 'rgba(56,189,248,0.8)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
        🚚 Capacité de Production
      </p>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginBottom: '16px', marginTop: '-8px' }}>
        Renseignez les capacités de production et les délais de livraison.
      </p>

      <p style={subLabel}>📦 Volumes de commande</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={fieldLabel}>Quantité minimale</label>
          <Controller
            name="minOrderQuantity"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={0}
                placeholder="Ex: 100"
                suffix="unités"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            )}
          />
          {errors.minOrderQuantity && <p style={fieldError}>{errors.minOrderQuantity.message}</p>}
        </div>
        <div>
          <label style={fieldLabel}>Quantité max / mois</label>
          <Controller
            name="maxMonthlyQuantity"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={0}
                placeholder="Ex: 10 000"
                suffix="unités"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            )}
          />
          {errors.maxMonthlyQuantity && <p style={fieldError}>{errors.maxMonthlyQuantity.message}</p>}
        </div>
      </div>

      <div style={divider} />
      <p style={subLabel}>⏱️ Délais de livraison</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={fieldLabel}>Délai standard</label>
          <Controller
            name="averageDeliveryDays"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={0}
                placeholder="Ex: 14"
                suffix="jours"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            )}
          />
        </div>
        <div>
          <label style={{ ...fieldLabel, color: 'rgba(251,146,60,0.6)' }}>⚡ Délai express</label>
          <Controller
            name="expressDeliveryDays"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={0}
                placeholder="Ex: 5"
                suffix="jours"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            )}
          />
        </div>
      </div>

      <div style={divider} />
      <p style={subLabel}>🌐 Zone de livraison</p>

      <Controller
        name="deliveryZone"
        control={control}
        render={({ field }) => (
          <Select
            field={field}
            options={DELIVERY_ZONE_OPTIONS}
            placeholder="Choisissez la zone"
            value={DELIVERY_ZONE_OPTIONS.find((o) => o.value === field.value) || null}
            onChange={(option: any) => field.onChange(option?.value || null)}
            isClearable
          />
        )}
      />
    </div>
  );
};

export default ProductionCapacityFields;
