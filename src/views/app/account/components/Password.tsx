import { updateUserPassword, useAppDispatch, useAppSelector } from '@/store';
import { User } from '@/@types/user';
import DefinePassword, { UserPasswordFormModel } from './DefinePassword';

const Password = ({ onTabChange }: { onTabChange: (val: string) => void }) => {
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);

  const onFormSubmit = async (
    values: UserPasswordFormModel,
    setSubmitting: (isSubmitting: boolean) => void
  ) : Promise<void> => {
    dispatch(
      updateUserPassword({ newPassword: values.newPassword, id: user.id })
    );
    setSubmitting(false);
    onTabChange('profile');
  };

  return (
    <DefinePassword onFormSubmit={onFormSubmit} />
  );
};

export default Password;
