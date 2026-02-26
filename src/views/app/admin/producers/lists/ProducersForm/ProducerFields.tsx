import AdaptableCard from '@/components/shared/AdaptableCard';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import {
  Controller,
  FieldErrors,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import { t } from 'i18next';
import { Select } from '@/components/ui';
import { ProducerFormModel } from './ProducerForm';
type country = {
  label: string;
  dialCode: string;
  value: string;
};

type ProducerFieldsProps = {
  countries: country[];
  errors: FieldErrors<ProducerFormModel>;
  control: any;
  watch: UseFormWatch<ProducerFormModel>;
  setValue: UseFormSetValue<ProducerFormModel>;
};

const ProducerFields = (props: ProducerFieldsProps) => {
  const { countries, errors, control, watch, setValue } = props;
  const values = watch();

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
    <AdaptableCard bordered={false} className="mb-4">
      <h5>{t('p.producer')}</h5>
      <p className="mb-6">{t('p.producer_description')}</p>
      <div className="flex gap-4">
        <FormItem
          label="Nom du producteur"
          className="w-full"
          invalid={errors.name ? true : false}
          errorMessage={errors.name?.message}
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder="Nom du producteur"
              />
            )}
          />
        </FormItem>
      </div>
      <FormItem
        label={t('address')}
        invalid={errors.address ? true : false}
        errorMessage={errors.address?.message}
      >
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="text"
              autoComplete="off"
              placeholder={t('address')}
            />
          )}
        />
      </FormItem>
      <div className="flex gap-4">
        <FormItem
          label={t('zipCode')}
          className="w-1/3"
          invalid={errors.zipCode ? true : false}
          errorMessage={errors.zipCode?.message}
        >
          <Controller
            name="zipCode"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder={t('zipCode')}
              />
            )}
          />
        </FormItem>
        <FormItem
          label={t('city')}
          className="w-1/3"
          invalid={errors.city ? true : false}
          errorMessage={errors.city?.message}
        >
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder={t('city')}
              />
            )}
          />
        </FormItem>
        <FormItem
          label={t('country')}
          className="w-1/3"
          invalid={errors.country ? true : false}
          errorMessage={errors.country?.message}
        >
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <Select
                field={field}
                options={countries}
                placeholder="Choisissez le pays"
                value={countries.filter(
                  (country) => country.value === field.value
                )}
                onChange={(option) => field.onChange(option?.value)}
              />
            )}
          />
        </FormItem>
      </div>
      <div className="flex gap-4">
        <FormItem
          label={t('phone')}
          className="w-1/2"
          invalid={errors.phoneNumber ? true : false}
          errorMessage={errors.phoneNumber?.message}
        >
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder={t('phone')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const formattedNumber = formatPhoneNumber(e.target.value);
                  field.onChange(formattedNumber);
                }}
              />
            )}
          />
        </FormItem>
        <FormItem
          label={t('email')}
          className="w-1/2"
          invalid={errors.email ? true : false}
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
      </div>
    </AdaptableCard>
  );
};

export default ProducerFields;
