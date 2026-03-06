import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { useState } from 'react';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import { AiOutlineSave } from 'react-icons/ai';

export type UserPasswordFormModel = {
  newPassword: string;
  confirmNewPassword: string;
};

const validationSchema = Yup.object().shape({
  newPassword: Yup.string()
    .required('Nouveau mot de passe requis')
    .min(5, 'Mot de passe trop court (5 caractères min)'),
  confirmNewPassword: Yup.string()
    .required('Confirmation requise')
    .oneOf([Yup.ref('newPassword')], 'Les mots de passe ne correspondent pas'),
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '10px 40px 10px 14px',
  color: '#fff',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const PasswordInput = ({ field, error, placeholder, show, onToggle }: {
  field: any;
  error?: string;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) => (
  <div>
    <div style={{ position: 'relative' }}>
      <input
        {...field}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete="new-password"
        style={{ ...inputStyle, borderColor: error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)' }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
        onBlur={(e) => { e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.09)'; field.onBlur() }}
      />
      <button
        type="button"
        onClick={onToggle}
        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: 0 }}
      >
        {show ? <HiEyeOff size={16} /> : <HiEye size={16} />}
      </button>
    </div>
    {error && <p style={{ color: '#f87171', fontSize: '11px', marginTop: '4px' }}>{error}</p>}
  </div>
);

const DefinePassword = ({
  onFormSubmit,
}: {
  onFormSubmit: (values: UserPasswordFormModel) => Promise<void>;
}) => {
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<UserPasswordFormModel>({
    resolver: yupResolver(validationSchema),
    defaultValues: { newPassword: '', confirmNewPassword: '' },
  });

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Icon + title */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(47,111,237,0.12)', border: '2px solid rgba(47,111,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b9eff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', textAlign: 'center', margin: 0 }}>
          Choisissez un mot de passe sécurisé<br />d'au moins 5 caractères
        </p>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: '24px' }} />

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Nouveau mot de passe *</label>
          <Controller name="newPassword" control={control} render={({ field }) => (
            <PasswordInput field={field} error={errors.newPassword?.message} placeholder="Nouveau mot de passe" show={showNew} onToggle={() => setShowNew((v) => !v)} />
          )} />
        </div>

        <div>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Confirmer le mot de passe *</label>
          <Controller name="confirmNewPassword" control={control} render={({ field }) => (
            <PasswordInput field={field} error={errors.confirmNewPassword?.message} placeholder="Confirmer le mot de passe" show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
          )} />
        </div>
      </div>

      {/* Action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '28px' }}>
        <button type="submit" disabled={isSubmitting}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: isSubmitting ? 'rgba(47,111,237,0.5)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}
        >
          <AiOutlineSave size={15} />
          {isSubmitting ? 'Modification…' : 'Modifier le mot de passe'}
        </button>
      </div>

    </form>
  );
};

export default DefinePassword;
