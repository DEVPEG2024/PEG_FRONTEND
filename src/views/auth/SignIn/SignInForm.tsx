import { useState } from 'react';
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage';
import useAuth from '@/utils/hooks/useAuth';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import type { CommonProps } from '@/@types/common';
import { HiEye, HiEyeOff } from 'react-icons/hi';

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
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  padding: '11px 14px',
  color: '#fff',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  marginBottom: '6px',
  display: 'block',
  fontFamily: 'Inter, sans-serif',
};

const errorStyle: React.CSSProperties = {
  color: '#f87171',
  fontSize: '11px',
  marginTop: '4px',
  fontFamily: 'Inter, sans-serif',
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

  return (
    <div className={className} style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Error message */}
      {message && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '20px',
          color: '#f87171',
          fontSize: '13px',
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(async (values) => {
        if (!disableSubmit) await onSignIn(values);
      })}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Email */}
          <div>
            <label style={labelStyle}>Adresse email</label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="email"
                  autoComplete="off"
                  placeholder="vous@exemple.com"
                  style={{
                    ...inputStyle,
                    borderColor: errors.email ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.6)'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.email ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'; field.onBlur(); }}
                />
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
                  <input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="off"
                    placeholder="••••••••"
                    style={{
                      ...inputStyle,
                      paddingRight: '42px',
                      borderColor: errors.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.6)'; }}
                    onBlur={(e) => { e.target.style.borderColor = errors.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'; field.onBlur(); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex',
                    }}
                  >
                    {showPassword ? <HiEyeOff size={16} /> : <HiEye size={16} />}
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
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <div
                    onClick={() => field.onChange(!field.value)}
                    style={{
                      width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                      background: field.value ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${field.value ? 'rgba(47,111,237,0.6)' : 'rgba(255,255,255,0.15)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                      cursor: 'pointer',
                    }}
                  >
                    {field.value && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>Se souvenir de moi</span>
                </label>
              )}
            />
            <a
              href={forgotPasswordUrl}
              style={{ color: '#6b9eff', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}
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
              background: isSubmitting ? 'rgba(47,111,237,0.5)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
              border: 'none',
              borderRadius: '10px',
              padding: '13px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(47,111,237,0.4)',
              transition: 'all 0.15s',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.01em',
            }}
          >
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>

        </div>
      </form>
    </div>
  );
};

export default SignInForm;
