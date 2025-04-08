import AdaptableCard from '@/components/shared/AdaptableCard';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik';
import { t } from 'i18next';
import { Select, Switcher } from '@/components/ui';
import { CustomerFormModel } from './CustomerForm';
type country = {
  label: string;
  dialCode: string;
  value: string;
};

type CustomerFields = {
  countries: country[];
  touched: FormikTouched<CustomerFormModel>;
  errors: FormikErrors<CustomerFormModel>;
  values: CustomerFormModel;
  setFieldValue: (
    field: string,
    value: string,
    shouldValidate?: boolean
  ) => void;
};

const CustomerFields = (props: CustomerFields) => {
  const { countries, errors, setFieldValue } = props;

  const formatPhoneNumber = (value: string): string => {
    // Retirer tous les espaces
    const digitsOnly = value.replace(/\D/g, '');
    // Ajouter les espaces après chaque 2 chiffres
    return digitsOnly
      .slice(0, 10) // Limiter à 10 chiffres
      .replace(/(\d{2})(?=\d)/g, '$1 ')
      .trim();
  };

  return (
    <AdaptableCard className="mb-4">
      <h5>{t('cust.customer')}</h5>
      <p className="mb-6">{t('cust.customer_description')}</p>
      <div className="flex gap-4">
        <FormItem
          label="Nom du client"
          className="w-2/3"
          invalid={errors.name ? true : false}
          errorMessage={errors.name}
        >
          <Field
            type="text"
            autoComplete="off"
            name="name"
            placeholder="Nom du client"
            component={Input}
            value={props.values.name}
          />
        </FormItem>
        <FormItem
          label="Paiment différé"
          invalid={errors.deferredPayment ? true : false}
          errorMessage={errors.deferredPayment}
        >
          <Field name="deferredPayment">
            {({ field, form }: FieldProps) => (
              <Switcher
                checked={props.values.deferredPayment}
                onChange={() => form.setFieldValue(field.name, !field.value)}
              />
            )}
          </Field>
        </FormItem>
      </div>
      <FormItem
        label={t('address')}
        invalid={errors.address ? true : false}
        errorMessage={errors.address}
      >
        <Field
          type="text"
          autoComplete="off"
          name="address"
          placeholder={t('address')}
          component={Input}
          value={props.values.address}
        />
      </FormItem>
      <div className="flex gap-4">
        <FormItem
          label={t('zipCode')}
          className="w-1/3"
          invalid={errors.zipCode ? true : false}
          errorMessage={errors.zipCode}
        >
          <Field
            type="text"
            autoComplete="off"
            name="zipCode"
            placeholder={t('zipCode')}
            component={Input}
            value={props.values.zipCode}
          />
        </FormItem>
        <FormItem
          label={t('city')}
          className="w-1/3"
          invalid={errors.city ? true : false}
          errorMessage={errors.city}
        >
          <Field
            type="text"
            autoComplete="off"
            name="city"
            placeholder={t('city')}
            component={Input}
            value={props.values.city}
          />
        </FormItem>
        <FormItem
          label={t('country')}
          className="w-1/3"
          invalid={errors.country ? true : false}
          errorMessage={errors.country}
        >
          <Field name="country">
            {({ field, form }: FieldProps) => (
              <Select
                field={field}
                form={form}
                options={countries}
                placeholder="Choisissez le pays"
                value={countries.filter(
                  (country) => country.value === field.value
                )}
                onChange={(option) =>
                  form.setFieldValue(field.name, option?.value)
                }
              />
            )}
          </Field>
        </FormItem>
      </div>
      <div className="flex gap-4">
        <FormItem
          label={t('phone')}
          className="w-1/2"
          invalid={errors.phoneNumber ? true : false}
          errorMessage={errors.phoneNumber}
        >
          <Field
            type="text"
            autoComplete="off"
            name="phoneNumber"
            placeholder={t('phone')}
            component={Input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const formattedNumber = formatPhoneNumber(e.target.value);
              setFieldValue('phoneNumber', formattedNumber);
            }}
          />
        </FormItem>
        <FormItem
          label={t('email')}
          className="w-1/2"
          invalid={errors.email ? true : false}
          errorMessage={errors.email}
        >
          <Field
            type="text"
            autoComplete="off"
            name="email"
            placeholder={t('email')}
            component={Input}
          />
        </FormItem>
      </div>
    </AdaptableCard>
  );
};

export default CustomerFields;
