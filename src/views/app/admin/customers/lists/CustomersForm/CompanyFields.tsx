import AdaptableCard from '@/components/shared/AdaptableCard';
import { FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Controller, FieldErrors, FieldValues } from 'react-hook-form';
import { t } from 'i18next';
import { Options } from '../EditCustomer';

type FormFieldsName = {
  customerCategory: string;
  vatNumber: string;
  siretNumber: string;
  website: string;
};

type CompanyFieldsProps = {
  customerCategories: Options[];
  control: any;
  errors: FieldErrors<FormFieldsName>;
  watch: any;
};

/** EU countries that use intra-community VAT numbers */
const EU_COUNTRIES = [
  'FR', 'DE', 'IT', 'ES', 'BE', 'NL', 'LU', 'AT', 'PT', 'IE', 'FI', 'SE',
  'DK', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'EE', 'LV', 'LT',
  'MT', 'CY', 'EL', 'GR',
]

const CompanyFields = (props: CompanyFieldsProps) => {
  const { customerCategories, errors, control, watch } = props;
  const selectedCountry: string = watch('country') ?? '';
  const isFrance = selectedCountry === 'FR';
  const isEU = EU_COUNTRIES.includes(selectedCountry);

  const vatLabel = isFrance ? 'N° TVA intracommunautaire' : isEU ? 'N° TVA intracommunautaire' : 'N° identification fiscale';
  const vatPlaceholder = isFrance ? 'FR XX XXXXXXXXX' : isEU ? 'Ex: DE123456789' : 'Tax ID';

  return (
    <AdaptableCard bordered={false} className="mb-4">
      <h5>{t('cust.organization')}</h5>
      <p className="mb-6">{t('cust.company_description')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1">
          <FormItem
            label={t('category')}
            invalid={errors.customerCategory ? true : false}
            errorMessage={errors.customerCategory?.message}
          >
            <Controller
              name="customerCategory"
              control={control}
              render={({ field }) => (
                <Select
                  field={field}
                  options={customerCategories}
                  placeholder="Choisissez la catégorie"
                  value={customerCategories.find((option) => {
                    return field.value === option.value;
                  })}
                  onChange={(option) => field.onChange(option?.value)}
                />
              )}
            />
          </FormItem>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={isFrance ? 'col-span-1' : 'col-span-2'}>
          <FormItem
            label={vatLabel}
            invalid={errors.vatNumber ? true : false}
            errorMessage={errors.vatNumber?.message}
          >
            <Controller
              name="vatNumber"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="text"
                  autoComplete="off"
                  placeholder={vatPlaceholder}
                />
              )}
            />
          </FormItem>
        </div>
        {isFrance && (
          <div className="col-span-1">
            <FormItem
              label="N° SIRET"
              invalid={errors.siretNumber ? true : false}
              errorMessage={errors.siretNumber?.message}
            >
              <Controller
                name="siretNumber"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    autoComplete="off"
                    placeholder="XXX XXX XXX XXXXX"
                  />
                )}
              />
            </FormItem>
          </div>
        )}
        <div className="col-span-2">
          <FormItem
            label="Site internet"
            invalid={errors.website ? true : false}
            errorMessage={errors.website?.message}
          >
            <Controller
              name="website"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="text"
                  autoComplete="off"
                  placeholder="https://..."
                />
              )}
            />
          </FormItem>
        </div>
      </div>
    </AdaptableCard>
  );
};

export default CompanyFields;
