import { useState } from 'react';
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage';
import useAuth from '@/utils/hooks/useAuth';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import type { CommonProps } from '@/@types/common';
import { HiEye, HiEyeOff, HiOutlineMail, HiOutlineLockClosed, HiArrowRight } from 'react-icons/hi';

interface SignInFormProps extends CommonProps {
  disableSubmit?: boolean;
  forgotPasswordUrl?: string;
}

type SignInFormSchema = {
  email: string;
  password: string;
  rememberMe: boolean;
};

const validationSchema = Yup.object().shape({
  email: Yup.string()
    .email('Veuillez entrer une adresse email valide')
    .required('Veuillez entrer votre adresse email'),
  password: Yup.string().required('Veuillez entrer votre mot de passe'),
  rememberMe: Yup.bool(),
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1.5px solid #e5e7eb',
  borderRadius: '12px',
  padding: '14px 14px 14px 46px',
  color: '#0f172a',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  color: '#334155',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '8px',
  display: 'block',
  fontFamily: 'Inter, sans-serif',
};

const errorStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '12px',
  marginTop: '6px',
  fontFamily: 'Inter, sans-serif',
};

const iconStyle: React.CSSProperties = {
  position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)',
  color: '#94a3b8', pointerEvents: 'none', display: 'flex',
};

const SignInForm = (props: SignInFormProps) => {
  const {
    disableSubmit = false,
    className,
    forgotPasswordUrl = '/forgot-password',
  } = props;

  const [message, setMessage] = useTimeOutMessage();
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormSchema>({
    resolver: yupResolver(validationSchema) as Resolver<SignInFormSchema>,
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  const onSignIn = async (values: SignInFormSchema) => {
    const { email, password } = values;
    const result = await signIn({ identifier: email, password });
    if (result?.status === 'failed') {
      setMessage(result.message);
    }
  };

  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#6d5dfc';
    e.target.style.boxShadow = '0 0 0 3px rgba(109,93,252,0.12)';
  };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>, hasError?: boolean) => {
    e.target.style.borderColor = hasError ? '#fca5a5' : '#e5e7eb';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div className={className} style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Error message */}
      {message && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '20px',
          color: '#dc2626',
          fontSize: '13px',
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(async (values) => {
        if (!disableSubmit) await onSignIn(values);
      })}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Email */}
          <div>
            <label style={labelStyle}>Adresse email</label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}><HiOutlineMail size={18} /></span>
                  <input
                    {...field}
                    type="email"
                    autoComplete="off"
                    placeholder="ex: carto@mypeg.fr"
                    style={{ ...inputStyle, borderColor: errors.email ? '#fca5a5' : '#e5e7eb' }}
                    onFocus={focusOn}
                    onBlur={(e) => { focusOff(e, !!errors.email); field.onBlur(); }}
                  />
                </div>
              )}
            />
            {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Mot de passe</label>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <div style={{ position: 'relative' }}>
                  <span style={iconStyle}><HiOutlineLockClosed size={18} /></span>
                  <input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="off"
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: '46px', borderColor: errors.password ? '#fca5a5' : '#e5e7eb' }}
                    onFocus={focusOn}
                    onBlur={(e) => { focusOff(e, !!errors.password); field.onBlur(); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: 'absolute', right: '14px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', padding: 0, display: 'flex',
                    }}
                  >
                    {showPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
                  </button>
                </div>
              )}
            />
            {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
          </div>

          {/* Remember me + Forgot password */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <label style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer' }}>
                  <div
                    onClick={() => field.onChange(!field.value)}
                    style={{
                      width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                      background: field.value ? 'linear-gradient(135deg, #6d5dfc, #4f3fd1)' : '#fff',
                      border: `1.5px solid ${field.value ? '#6d5dfc' : '#cbd5e1'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', cursor: 'pointer',
                    }}
                  >
                    {field.value && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ color: '#475569', fontSize: '13.5px', fontWeight: 500 }}>Se souvenir de moi</span>
                </label>
              )}
            />
            <a
              href={forgotPasswordUrl}
              style={{ color: '#5b4de0', fontSize: '13.5px', textDecoration: 'none', fontWeight: 600 }}
            >
              Mot de passe oublié ?
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              background: isSubmitting ? '#a5acef' : 'linear-gradient(135deg, #6d5dfc 0%, #4f3fd1 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '15px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: isSubmitting ? 'none' : '0 8px 24px rgba(109,93,252,0.35)',
              transition: 'all 0.15s',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
            {!isSubmitting && <HiArrowRight size={18} />}
          </button>

        </div>
      </form>
    </div>
  );
};

export default SignInForm;
