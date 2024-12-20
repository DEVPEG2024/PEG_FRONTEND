import { forwardRef } from 'react';
import { FormContainer } from '@/components/ui/Form';
import Button from '@/components/ui/Button';
import StickyFooter from '@/components/shared/StickyFooter';
import { Form, Formik, FormikProps } from 'formik';
import UserFields from './UserFields';
import cloneDeep from 'lodash/cloneDeep';
import { AiOutlineSave } from 'react-icons/ai';
import * as Yup from 'yup';
import { t } from 'i18next';
import { Options, UserFormModel } from '../EditUser';

type FormikRef = FormikProps<any>;

export type SetSubmitting = (isSubmitting: boolean) => void;

type UserForm = {
  initialData?: UserFormModel;
  type: 'edit' | 'new';
  onDiscard?: () => void;
  onFormSubmit: (formData: UserFormModel, setSubmitting: SetSubmitting) => void;
  customers: Options[];
  producers: Options[];
  roles: Options[];
};

const validationSchema = Yup.object().shape({
  userName: Yup.string().required(t('cust.error.lastName')),
  lastName: Yup.string().required(t('cust.error.lastName')),
  firstName: Yup.string().required(t('cust.error.firstName')),
  //phone: Yup.string().required(t('cust.error.phone')),
  email: Yup.string().required(t('cust.error.email')),
  authority: Yup.string().required(t('cust.error.category')),
});

const UserForm = forwardRef<FormikRef, UserForm>((props, ref) => {
  const {
    type,
    initialData,
    onFormSubmit,
    onDiscard,
    customers,
    producers,
    roles,
  } = props;

  return (
    <>
      <Formik
        innerRef={ref}
        initialValues={{
          ...initialData,
        }}
        validationSchema={validationSchema}
        onSubmit={(values: UserFormModel, { setSubmitting }) => {
          const formData = cloneDeep(values);
          onFormSubmit?.(formData, setSubmitting);
        }}
      >
        {({ values, touched, errors, isSubmitting }) => (
          <Form>
            <FormContainer>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-2">
                  <UserFields
                    values={values}
                    touched={touched}
                    errors={errors}
                    type={type}
                    customers={customers}
                    producers={producers}
                    roles={roles}
                  />
                </div>
              </div>
              <StickyFooter
                className="-mx-8 px-8 flex items-center justify-end py-4"
                stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >
                <div className="md:flex items-end">
                  <Button
                    size="sm"
                    className="ltr:mr-3 rtl:ml-3"
                    type="button"
                    onClick={() => onDiscard?.()}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    size="sm"
                    variant="solid"
                    loading={isSubmitting}
                    icon={<AiOutlineSave />}
                    type="submit"
                  >
                    {t('save')}
                  </Button>
                </div>
              </StickyFooter>
            </FormContainer>
          </Form>
        )}
      </Formik>
    </>
  );
});

UserForm.displayName = 'UserForm';

export default UserForm;
