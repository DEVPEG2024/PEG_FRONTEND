import { useState } from 'react';
import { toast } from 'react-toastify';
import { Alert } from '@/components/ui';
import { apiChangePassword } from '@/services/AuthService';
import { passwordErrorMessage } from '@/utils/passwordErrors';
import DefinePassword, { UserPasswordFormModel } from './DefinePassword';

const Password = ({ onTabChange }: { onTabChange: (val: string) => void }) => {
  const [error, setError] = useState<string | null>(null);

  const onFormSubmit = async (values: UserPasswordFormModel): Promise<void> => {
    setError(null);
    try {
      await apiChangePassword({
        currentPassword: values.currentPassword ?? '',
        password: values.newPassword,
        passwordConfirmation: values.confirmNewPassword,
      });
    } catch (err) {
      // Le formulaire reste ouvert, le message aussi : rien n'a changé côté serveur.
      setError(passwordErrorMessage(err, 'Le mot de passe n’a pas pu être modifié. Réessayez.'));
      return;
    }
    toast.success('Mot de passe modifié');
    onTabChange('profile');
  };

  return (
    <>
      <DefinePassword askCurrent onFormSubmit={onFormSubmit} />
      {error && (
        <Alert showIcon className="mt-4" type="danger">
          {error}
        </Alert>
      )}
    </>
  );
};

export default Password;
