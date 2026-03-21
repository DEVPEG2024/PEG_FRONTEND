import AdaptableCard from '@/components/shared/AdaptableCard';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import {
  Controller,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from 'react-hook-form';
import { t } from 'i18next';
import { Select, Switcher } from '@/components/ui';
import { Options, UserFormModel } from '../EditUser';

type UserFieldsProps = {
  onEdition: boolean;
  errors: FieldErrors<UserFormModel>;
  customers: Options[];
  producers: Options[];
  roles: Options[];
  control: any;
  watch: UseFormWatch<UserFormModel>;
  setValue: UseFormSetValue<UserFormModel>;
};

const UserFields = (props: UserFieldsProps) => {
  const {
    onEdition,
    errors,
    customers,
    producers,
    roles,
    control,
    watch,
    setValue,
  } = props;
  const values = watch();

  return (
    <AdaptableCard bordered={false} className="mb-4">
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
          invalid={!!errors.lastName}
          errorMessage={errors.lastName?.message}
        >
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder={t('lastname')}
              />
            )}
          />
        </FormItem>
        <FormItem
          label={t('firstname')}
          className="w-1/2"
          invalid={!!errors.firstName}
          errorMessage={errors.firstName?.message}
        >
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder={t('firstname')}
              />
            )}
          />
        </FormItem>
      </div>
      <div className="flex gap-4">
        <FormItem
          label={t('email')}
          className="w-1/2"
          invalid={!!errors.email}
          errorMessage={errors.email?.message}
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder={t('email')}
              />
            )}
          />
        </FormItem>
        <FormItem
          label={t('username')}
          className="w-1/2"
          invalid={!!errors.username}
          errorMessage={errors.username?.message}
        >
          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder={t('username')}
              />
            )}
          />
        </FormItem>
      </div>
      <div className="flex gap-4">
        <FormItem
          label="Rôle"
          className="w-1/2"
          invalid={!!errors.role}
          errorMessage={errors.role?.message}
        >
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select
                options={roles}
                placeholder="Choisir un rôle"
                value={roles.find((option) => {
                  return field.value === option.value;
                })}
                onChange={(selectedOption) => {
                  const value = selectedOption?.value;
                  field.onChange(value);
                }}
              />
            )}
          />
        </FormItem>
        {values.role ===
          roles.find(({ label }) => label === 'customer')?.value && (
          <FormItem
            label="Client"
            className="w-1/2"
            invalid={!!errors.customer}
            errorMessage={errors.customer?.message}
          >
            <Controller
              name="customer"
              control={control}
              render={({ field }) => (
                <Select
                  options={customers}
                  placeholder="Choisir un client"
                  value={customers.find((option) => {
                    return field.value === option.value;
                  })}
                  onChange={(selectedOption) => {
                    const value = selectedOption?.value;
                    field.onChange(value);
                  }}
                />
              )}
            />
          </FormItem>
        )}
        {values.role ===
          roles.find(({ label }) => label === 'producer')?.value && (
          <FormItem
            label="Producteur"
            className="w-1/2"
            invalid={!!errors.producer}
            errorMessage={errors.producer?.message}
          >
            <Controller
              name="producer"
              control={control}
              render={({ field }) => (
                <Select
                  options={producers}
                  placeholder="Choisir un producteur"
                  value={producers.find((option) => {
                    return field.value === option.value;
                  })}
                  onChange={(selectedOption) => {
                    const value = selectedOption?.value;
                    field.onChange(value);
                  }}
                />
              )}
            />
          </FormItem>
        )}
      </div>
      <div className="flex gap-4">
        <FormItem
          label={t('actif')}
          className="w-1/2"
          invalid={!!errors.blocked}
          errorMessage={errors.blocked?.message}
        >
          <Controller
            name="blocked"
            control={control}
            render={({ field }) => (
              <Switcher
                checked={!field.value}
                onChange={(val) => field.onChange(val)}
              />
            )}
          />
        </FormItem>
      </div>
    </AdaptableCard>
  );
};

export default UserFields;
