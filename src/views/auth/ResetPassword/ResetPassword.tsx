import { ActionLink } from '@/components/shared';
import { Alert } from '@/components/ui';
import { apiResetPassword } from '@/services/AuthService';
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage';
import DefinePassword, { UserPasswordFormModel } from '@/views/app/account/components/DefinePassword';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const ResetPassword = () => {

  const [passwordReset, setPasswordReset] = useState<boolean>(false);
  const [message, setMessage] = useTimeOutMessage();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? '';

  const onFormSubmit = async (
      values: UserPasswordFormModel,
      setSubmitting: (isSubmitting: boolean) => void
    ) : Promise<void> => {
      setSubmitting(true);
      try {
        const resp = await apiResetPassword({
          code,
          password: values.newPassword,
          passwordConfirmation: values.confirmNewPassword
        });
        if (resp.data) {
          setSubmitting(false);
          setPasswordReset(true);
        }
      } catch (errors) {
        setMessage(
          (errors as AxiosError<{ message: string }>)?.response?.data?.message ||
            (errors as Error).toString()
        );
        setSubmitting(false);
      }
    };

    return (
      <div>
        {passwordReset ? (
          <div>
            <h3 className="mb-1">Votre passe a bien été modifié</h3>
            <div className="mt-4 text-center">
              <ActionLink to={'/sign-in'}>
                Retour à la page de connexion
              </ActionLink>
            </div>
          </div>
        ) : (
          <DefinePassword onFormSubmit={onFormSubmit}/>
        )}
        {message && (
          <Alert showIcon className="mb-4" type="danger">
            {message}
          </Alert>
        )}
      </div>
    )
};

export default ResetPassword;
