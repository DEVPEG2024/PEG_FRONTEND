import { ActionLink } from '@/components/shared';
import { Alert } from '@/components/ui';
import { apiResetPassword } from '@/services/AuthService';
import useAuth from '@/utils/hooks/useAuth';
import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage';
import { passwordErrorMessage } from '@/utils/passwordErrors';
import DefinePassword, {
  UserPasswordFormModel,
} from '@/views/app/account/components/DefinePassword';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const ResetPassword = () => {
  const [passwordReset, setPasswordReset] = useState<boolean>(false);
  const [message, setMessage] = useTimeOutMessage();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? '';
  // Lien ouvert sur un appareil déjà connecté (PublicRoute le laisse passer) : la
  // session reste ouverte, le retour mène donc à l'accueil.
  const { authenticated } = useAuth();

  // DefinePassword (react-hook-form) gère lui-même l'état isSubmitting et
  // n'appelle onFormSubmit qu'avec les valeurs → signature à un seul argument.
  const onFormSubmit = async (
    values: UserPasswordFormModel
  ): Promise<void> => {
    try {
      const resp = await apiResetPassword({
        code,
        password: values.newPassword,
        passwordConfirmation: values.confirmNewPassword,
      });
      if (resp.data) {
        setPasswordReset(true);
      }
    } catch (errors) {
      setMessage(passwordErrorMessage(errors, 'Le mot de passe n’a pas pu être modifié. Réessayez.'));
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}>
      {passwordReset ? (
        <div>
          <h3 className="mb-1">Votre mot de passe a bien été modifié</h3>
          <div className="mt-4 text-center">
            <ActionLink to={'/sign-in'}>
              {authenticated ? 'Retour à l’accueil' : 'Retour à la page de connexion'}
            </ActionLink>
          </div>
        </div>
      ) : (
        <DefinePassword onFormSubmit={onFormSubmit} />
      )}
      {message && (
        <Alert showIcon className="mb-4" type="danger">
          {message}
        </Alert>
      )}
    </div>
  );
};

export default ResetPassword;
