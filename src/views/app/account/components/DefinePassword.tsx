import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { FormContainer } from '@/components/ui/Form';
import FormDescription from './FormDescription';
import FormRow from './FormRow';
import { Field, Form, Formik } from 'formik';

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

const DefinePassword = ({onFormSubmit}: {onFormSubmit: (
      values: UserPasswordFormModel,
      setSubmitting: (isSubmitting: boolean) => void)
    => Promise<void>}) => {

  const initialData: UserPasswordFormModel = {
    newPassword: '',
    confirmNewPassword: '',
  };

  return (
    <Formik
      initialValues={{ ...initialData }}
      validationSchema={validationSchema}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(true);
        setTimeout(() => {
          onFormSubmit(values, setSubmitting);
        }, 1000);
      }}
    >
      {({ touched, errors, isSubmitting }) => {
        const validatorProps = { touched, errors };
        return (
          <Form>
            <FormContainer>
              <FormDescription
                title="Mot de passe"
                desc="Modifier votre mot de passe"
              />
              <FormRow
                name="newPassword"
                label="Nouveau mot de passe"
                {...validatorProps}
              >
                <Field
                  type="password"
                  autoComplete="off"
                  name="newPassword"
                  placeholder="Nouveau mot de passe"
                  component={Input}
                />
              </FormRow>
              <FormRow
                name="confirmNewPassword"
                label="Confirmez le nouveau mot de passe"
                {...validatorProps}
              >
                <Field
                  type="password"
                  autoComplete="off"
                  name="confirmNewPassword"
                  placeholder="Confirmez le nouveau mot de passe"
                  component={Input}
                />
              </FormRow>

              <div className="mt-4 ltr:text-right">
                <Button variant="solid" loading={isSubmitting} type="submit">
                  {isSubmitting ? 'Modification...' : 'Modifier'}
                </Button>
              </div>
            </FormContainer>
          </Form>
        );
      }}
    </Formik>
  );
};

export default DefinePassword;
