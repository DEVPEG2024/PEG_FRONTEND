import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Checkbox from '@/components/ui/Checkbox';
import { FormItem, FormContainer } from '@/components/ui/Form';
import Alert from '@/components/ui/Alert';
import PasswordInput from '@/components/shared/PasswordInput';
import ActionLink from '@/components/shared/ActionLink';
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage';
import useAuth from '@/utils/hooks/useAuth';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import type { CommonProps } from '@/@types/common';
import { useTranslation } from 'react-i18next';

interface SignInFormProps extends CommonProps {
  disableSubmit?: boolean;
  forgotPasswordUrl?: string;
  signUpUrl?: string;
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

const SignInForm = (props: SignInFormProps) => {
  const { t } = useTranslation();
  const {
    disableSubmit = false,
    className,
    forgotPasswordUrl = '/forgot-password',
  } = props;

  const [message, setMessage] = useTimeOutMessage();

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
    <div className={className}>
      {message && (
        <Alert showIcon className="mb-4" type="danger">
          <>{message}</>
        </Alert>
      )}
      <form
        onSubmit={handleSubmit(async (values: SignInFormSchema) => {
          if (!disableSubmit) {
            await onSignIn(values);
          }
        })}
      >
        <FormContainer>
          <FormItem
            label={t('email_address')}
            invalid={!!errors.email}
            errorMessage={errors.email?.message}
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="text"
                  autoComplete="off"
                  placeholder={t('email_address')}
                />
              )}
            />
          </FormItem>
          <FormItem
            label={t('password')}
            invalid={!!errors.password}
            errorMessage={errors.password?.message}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <PasswordInput
                  {...field}
                  autoComplete="off"
                  placeholder={t('password')}
                />
              )}
            />
          </FormItem>
          <div className="flex justify-between mb-6">
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onChange={(checked) => field.onChange(checked)}
                  className="mb-0"
                >
                  {t('remember_me')}
                </Checkbox>
              )}
            />
            <ActionLink to={forgotPasswordUrl}>
              {t('forgot_password')}
            </ActionLink>
          </div>
          <Button block loading={isSubmitting} variant="solid" type="submit">
            {t('sign_in')}
          </Button>
        </FormContainer>
      </form>
    </div>
  );
};

export default SignInForm;
