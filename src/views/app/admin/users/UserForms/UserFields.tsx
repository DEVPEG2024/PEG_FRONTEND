import AdaptableCard from '@/components/shared/AdaptableCard';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Field, FieldProps, FormikErrors, FormikTouched } from 'formik';
import { t } from 'i18next';
import { Select, Switcher } from '@/components/ui';
import { Options, UserFormModel } from '../EditUser';

type UserFields = {
  values: UserFormModel;
  onEdition: boolean;
  touched: FormikTouched<UserFormModel>;
  errors: FormikErrors<UserFormModel>;
  customers: Options[];
  producers: Options[];
  roles: Options[];
};

const UserFields = (props: UserFields) => {
  const { onEdition, touched, errors, customers, producers, roles } = props;

  return (
    <AdaptableCard className="mb-4">
      <h5>
        {onEdition
          ? 'Modifier les informations de base'
          : 'Ajouter des informations de base'}
      </h5>
      <p className="mb-6">
        {onEdition
          ? 'Modifier les informations de base'
          : 'Ajouter des informations de base'}
      </p>

      <div className="flex  gap-4">
        <FormItem
          label={t('lastname')}
          className="w-1/2"
          invalid={(errors.lastName && touched.lastName) as boolean}
          errorMessage={errors.lastName}
        >
          <Field
            type="text"
            autoComplete="off"
            name="lastName"
            placeholder={t('lastname')}
            component={Input}
            value={props.values.lastName}
          />
        </FormItem>
        <FormItem
          label={t('firstname')}
          className="w-1/2"
          invalid={(errors.firstName && touched.firstName) as boolean}
          errorMessage={errors.firstName}
        >
          <Field
            type="text"
            autoComplete="off"
            name="firstName"
            placeholder={t('firstname')}
            component={Input}
            value={props.values.firstName}
          />
        </FormItem>
      </div>
      <div className="flex gap-4">
        <FormItem
          label={t('email')}
          className="w-1/2"
          invalid={(errors.email && touched.email) as boolean}
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
        <FormItem
          label={t('username')}
          className="w-1/2"
          invalid={(errors.username && touched.username) as boolean}
          errorMessage={errors.username}
        >
          <Field
            type="text"
            autoComplete="off"
            name="username"
            placeholder={t('username')}
            component={Input}
            value={props.values.username}
          />
        </FormItem>
      </div>
      <div className="flex gap-4">
        <FormItem label="Rôle" className="w-1/2">
          <Field name="role">
            {({ field, form }: FieldProps) => (
              <Select
                options={roles}
                placeholder="Choisir un rôle"
                value={roles.find((option) => {
                  return field.value === option.value;
                })}
                onChange={(selectedOption) => {
                  const value = selectedOption?.value;
                  form.setFieldValue(field.name, value);
                }}
              />
            )}
          </Field>
        </FormItem>
        {props.values.role === roles.find(({label}) => label === 'customer')?.value && (
          <FormItem label="Client" className="w-1/2">
            <Field name="customer">
              {({ field, form }: FieldProps) => (
                <Select
                  options={customers}
                  placeholder="Choisir un client"
                  value={customers.find((option) => {
                    return field.value === option.value;
                  })}
                  onChange={(selectedOption) => {
                    const value = selectedOption?.value;
                    form.setFieldValue(field.name, value);
                  }}
                />
              )}
            </Field>
          </FormItem>
        )}
        {props.values.role === roles.find(({label}) => label === 'producer')?.value && (
          <FormItem label="Producteur" className="w-1/2">
            <Field name="producer">
              {({ field, form }: FieldProps) => (
                <Select
                  options={producers}
                  placeholder="Choisir un producteur"
                  value={producers.find((option) => {
                    return field.value === option.value;
                  })}
                  onChange={(selectedOption) => {
                    const value = selectedOption?.value;
                    form.setFieldValue(field.name, value);
                  }}
                />
              )}
            </Field>
          </FormItem>
        )}
      </div>
      <div className="flex gap-4">
        <FormItem
          label={t('actif')}
          className="w-1/2"
          invalid={(errors.blocked && touched.blocked) as boolean}
          errorMessage={errors.blocked}
        >
          <Field name="blocked">
            {({ field, form }: FieldProps) => (
              <Switcher
                checked={!props.values.blocked}
                onChange={() => form.setFieldValue(field.name, !field.value)}
              />
            )}
          </Field>
        </FormItem>
      </div>
    </AdaptableCard>
  );
};

export default UserFields;
