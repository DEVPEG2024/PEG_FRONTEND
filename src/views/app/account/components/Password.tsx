import { updateUserPassword, useAppDispatch, useAppSelector } from '@/store';
import { User } from '@/@types/user';
import DefinePassword, { UserPasswordFormModel } from './DefinePassword';

const Password = ({ onTabChange }: { onTabChange: (val: string) => void }) => {
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);

  const onFormSubmit = async (values: UserPasswordFormModel): Promise<void> => {
    await dispatch(updateUserPassword({ newPassword: values.newPassword, id: (user as any).id }));
    onTabChange('profile');
  };

  return <DefinePassword onFormSubmit={onFormSubmit} />;
};

export default Password;
