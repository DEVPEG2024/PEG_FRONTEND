import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { FormContainer } from '@/components/ui/Form';
import FormDescription from './FormDescription';
import FormRow from './FormRow';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import * as Yup from 'yup';

export type UserPasswordFormModel = {
  newPassword: string;
  confirmNewPassword: string;
};

const validationSchema = Yup.object().shape({
  newPassword: Yup.string()
    .required('Nouveau mot de passe requis')
    .min(5, 'Mot de passe trop court'),
  confirmNewPassword: Yup.string()
    .required('Confirmation requise')
    .oneOf([Yup.ref('newPassword')], 'Les mots de passe ne correspondent pas'),
});

const DefinePassword = ({
  onFormSubmit,
}: {
  onFormSubmit: (values: UserPasswordFormModel) => Promise<void>;
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<UserPasswordFormModel>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (values: UserPasswordFormModel) => {
    await onFormSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormContainer>
        <FormDescription
          title="Mot de passe"
          desc="Modifier votre mot de passe"
        />
        <FormRow
          name="newPassword"
          label="Nouveau mot de passe"
          touched={touchedFields}
          errors={errors}
        >
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="password"
                autoComplete="off"
                placeholder="Nouveau mot de passe"
              />
            )}
          />
        </FormRow>
        <FormRow
          name="confirmNewPassword"
          label="Confirmez le nouveau mot de passe"
          touched={touchedFields}
          errors={errors}
        >
          <Controller
            name="confirmNewPassword"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="password"
                autoComplete="off"
                placeholder="Confirmez le nouveau mot de passe"
              />
            )}
          />
        </FormRow>

        <div className="mt-4 ltr:text-right">
          <Button variant="solid" loading={isSubmitting} type="submit">
            {isSubmitting ? 'Modification...' : 'Modifier'}
          </Button>
        </div>
      </FormContainer>
    </form>
  );
};

export default DefinePassword;
