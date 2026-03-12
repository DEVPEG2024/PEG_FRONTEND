import Input from '@/components/ui/Input';
import { Controller } from 'react-hook-form';

type QualityFieldsProps = {
  control: any;
  errors: any;
};

const cardWrap: React.CSSProperties = {
  padding: '1.5px',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.03) 55%, rgba(255,255,255,0.11) 100%)',
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
          color: value !== null && value >= star ? '#fbbf24' : 'rgba(255,255,255,0.1)',
          transition: 'color 0.15s',
          padding: '0 1px',
          lineHeight: 1,
        }}
      >
        ★
      </button>
    ))}
    {value !== null && (
      <span style={{ marginLeft: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px', padding: '2px 10px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700 }}>
        {value}/5
      </span>
    )}
  </div>
);

const QualityFields = ({ control, errors }: QualityFieldsProps) => {
  return (
    <div style={cardWrap}>
      <div style={cardInner}>
        <p style={sectionTitle}>Qualité & Fiabilité</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginBottom: '16px', marginTop: '-6px' }}>
          Évaluez la fiabilité et la satisfaction client du producteur.
        </p>

        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Note de fiabilité</p>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
          <Controller
            name="reliabilityScore"
            control={control}
            render={({ field }) => (
              <StarRating value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Statistiques</p>

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
        <p style={{ ...sectionTitle, marginBottom: '12px' }}>Commentaires internes</p>

        <Controller
          name="internalComments"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              textArea
              rows={4}
              placeholder="Notes internes (non visibles par le producteur)..."
            />
          )}
        />
      </div>
    </div>
  );
};

export default QualityFields;
