import { forwardRef } from 'react';
import { FormContainer } from '@/components/ui/Form';
import Button from '@/components/ui/Button';
import StickyFooter from '@/components/shared/StickyFooter';
import { Form, Formik, FormikProps } from 'formik';
import CustomerFields from './CustomerFields';
import CompanyFields from './CompanyFields';
import cloneDeep from 'lodash/cloneDeep';
import { AiOutlineSave } from 'react-icons/ai';
import * as Yup from 'yup';
import { t } from 'i18next';
import { countries } from '@/constants/countries.constant';
import { Options } from '../EditCustomer';
import { Customer } from '@/@types/customer';

type FormikRef = FormikProps<any>;

export type CustomerFormModel = Omit<
  Customer,
  'banner' | 'customerCategory' | 'orderItems' | 'companyInformations'
> & {
  banner: string | null;
  customerCategory: string | null;
  email: string;
  phoneNumber: string;
  vatNumber: string;
  siretNumber: string;
  address: string;
  zipCode: string;
  city: string;
  country: string;
  website: string;
};

export type SetSubmitting = (isSubmitting: boolean) => void;

type CustomerForm = {
  initialData?: CustomerFormModel;
  customerCategories: Options[];
  onDiscard?: () => void;
  onFormSubmit: (
    formData: CustomerFormModel,
    setSubmitting: SetSubmitting
  ) => void;
};

const validationSchema = Yup.object().shape({
  website: Yup.string(),
  siretNumber: Yup.string().required(t('cust.error.siretNumber')),
  vatNumber: Yup.string().required(t('cust.error.vatNumber')),
  customerCategory: Yup.string().required(t('cust.error.customerCategory')),
  name: Yup.string().required(t('cust.error.name')),
  address: Yup.string().required(t('cust.error.address')),
  zipCode: Yup.string().required(t('cust.error.zipCode')),
  city: Yup.string().required(t('cust.error.city')),
  country: Yup.string().required(t('cust.error.country')),
  email: Yup.string()
    .email(t('cust.error.invalidEmail'))
    .required(t('cust.error.email')),
  //phone: Yup.string().matches(/^((\\+[1-9]{1,4}[ \\-]*)|(\\([0-9]{2,3}\\)[ \\-]*)|([0-9]{2,4})[ \\-]*)*?[0-9]{3,4}?[ \\-]*[0-9]{3,4}?$/, 'Numéro de téléphone invalide').required(t('cust.error.phone')),
  //phone: Yup.string().matches(/^((\+[1-9]{1,4}[ -]?)|(\([0-9]{2,3}\)[ -]?)|([0-9]{2,4})[ -]?)*?[0-9]{3,4}[ -]?[0-9]{3,4}$/, 'Numéro de téléphone invalide').required(t('cust.error.phone')),
  phoneNumber: Yup.string()
    .matches(/^0[1-9](?: [0-9]{2}){4}$/, 'Numéro de téléphone invalide')
    .required(t('cust.error.phoneNumber')),
});

const CustomerForm = forwardRef<FormikRef, CustomerForm>((props, ref) => {
  const { initialData, onFormSubmit, onDiscard, customerCategories } = props;

  return (
    <>
      <Formik
        innerRef={ref}
        initialValues={{
          ...initialData,
        }}
        validationSchema={validationSchema}
        onSubmit={(values: CustomerFormModel, { setSubmitting }) => {
          const formData = cloneDeep(values);
          onFormSubmit?.(formData, setSubmitting);
        }}
      >
        {({ values, touched, errors, isSubmitting, setFieldValue }) => {
          return (
            <Form>
              <FormContainer>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-2">
                    <CustomerFields
                      touched={touched}
                      errors={errors}
                      values={values}
                      countries={countries}
                      setFieldValue={setFieldValue}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <CompanyFields
                      touched={touched}
                      errors={errors}
                      values={values}
                      customerCategories={customerCategories}
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
          );
        }}
      </Formik>
    </>
  );
});

CustomerForm.displayName = 'CustomerForm';

export default CustomerForm;
