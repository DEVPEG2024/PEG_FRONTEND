import { useState } from 'react';
import { FormItem, FormContainer } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ActionLink from '@/components/shared/ActionLink';
import { apiForgotPassword } from '@/services/AuthService';
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import type { CommonProps } from '@/@types/common';
import type { AxiosError } from 'axios';

interface ForgotPasswordFormProps extends CommonProps {
  disableSubmit?: boolean;
  signInUrl?: string;
}

type ForgotPasswordFormSchema = {
  email: string;
};

const validationSchema = Yup.object().shape({
  email: Yup.string().required('Veuillez renseigner votre email'),
});

const ForgotPasswordForm = (props: ForgotPasswordFormProps) => {
  const { disableSubmit = false, className, signInUrl = '/sign-in' } = props;

  const [emailSent, setEmailSent] = useState(false);

  const [message, setMessage] = useTimeOutMessage();

  const onSendMail = async (values: ForgotPasswordFormSchema) => {
    try {
      const resp = await apiForgotPassword(values);
      if (resp.data) {
        setEmailSent(true);
      }
    } catch (errors) {
      setMessage(
        (errors as AxiosError<{ message: string }>)?.response?.data?.message ||
          (errors as Error).toString()
      );
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormSchema>({
    resolver: yupResolver(validationSchema),
    defaultValues: { email: '' },
  });

  return (
    <div className={className}>
      <div className="mb-6">
        {emailSent ? (
          <>
            <h3 className="mb-1">Vérifier votre email</h3>
            <p>
              Nous avons envoyé un code de réinitialisation de mot de passe à
              votre email
            </p>
          </>
        ) : (
          <>
            <h3 className="mb-1">Mot de passe oublié</h3>
            <p>
              Veuillez entrer votre adresse email pour recevoir un code de
              vérification
            </p>
          </>
        )}
      </div>
      {message && (
        <Alert showIcon className="mb-4" type="danger">
          {message}
        </Alert>
      )}
      <form
        onSubmit={handleSubmit(async (values) => {
          if (!disableSubmit) {
            await onSendMail(values);
          }
        })}
      >
        <FormContainer>
          <div className={emailSent ? 'hidden' : ''}>
            <FormItem
              invalid={!!errors.email}
              errorMessage={errors.email?.message}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="email"
                    autoComplete="off"
                    placeholder="Email"
                  />
                )}
              />
            </FormItem>
          </div>
          <Button block loading={isSubmitting} variant="solid" type="submit">
            {emailSent ? 'Renvoyer le code' : 'Envoyer le code'}
          </Button>
          <div className="mt-4 text-center">
            <ActionLink to={signInUrl}>
              Retour à la page de connexion
            </ActionLink>
          </div>
        </FormContainer>
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
