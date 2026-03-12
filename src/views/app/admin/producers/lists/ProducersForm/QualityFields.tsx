import Input from '@/components/ui/Input';
import { Controller } from 'react-hook-form';

type QualityFieldsProps = {
  control: any;
  errors: any;
};

const card: React.CSSProperties = {
  background: 'linear-gradient(160deg, #0d2015 0%, #081510 100%)',
  border: '1.5px solid rgba(34,197,94,0.2)',
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
  color: 'rgba(34,197,94,0.5)',
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '12px',
};

const StarRating = ({ value, onChange }: { value: number | null; onChange: (v: number) => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '22px',
          color: value !== null && value >= star ? '#fbbf24' : 'rgba(255,255,255,0.12)',
          transition: 'color 0.15s',
          padding: '0 1px',
          lineHeight: 1,
        }}
      >
        ★
      </button>
    ))}
    {value !== null && (
      <span style={{ marginLeft: '8px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '999px', padding: '2px 10px', color: '#fbbf24', fontSize: '11px', fontWeight: 700 }}>
        {value}/5
      </span>
    )}
  </div>
);

const QualityFields = ({ control, errors }: QualityFieldsProps) => {
  return (
    <div style={card}>
      <p style={{ color: 'rgba(34,197,94,0.8)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
        🛡️ Qualité & Fiabilité
      </p>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginBottom: '16px', marginTop: '-8px' }}>
        Évaluez la fiabilité et la satisfaction client du producteur.
      </p>

      {/* Star rating */}
      <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
        <p style={{ ...subLabel, color: 'rgba(251,191,36,0.5)', marginBottom: '10px' }}>⭐ Note de fiabilité</p>
        <Controller
          name="reliabilityScore"
          control={control}
          render={({ field }) => (
            <StarRating value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <p style={subLabel}>📊 Statistiques</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        <div>
          <label style={fieldLabel}>Satisfaction client</label>
          <Controller
            name="customerSatisfactionRate"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={0}
                max={100}
                placeholder="Ex: 95"
                suffix="%"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            )}
          />
          {errors.customerSatisfactionRate && <p style={fieldError}>{errors.customerSatisfactionRate.message}</p>}
        </div>
        <div>
          <label style={fieldLabel}>Commandes réalisées</label>
          <Controller
            name="completedOrdersCount"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={0}
                placeholder="Ex: 42"
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
      <p style={subLabel}>💬 Commentaires internes</p>

      <Controller
        name="internalComments"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            textArea
            rows={4}
            placeholder="Notes internes sur le producteur (non visibles par le producteur)..."
          />
        )}
      />
    </div>
  );
};

export default QualityFields;
