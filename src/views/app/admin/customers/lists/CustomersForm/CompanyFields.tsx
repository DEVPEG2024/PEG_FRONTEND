import AdaptableCard from '@/components/shared/AdaptableCard';
import { FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Controller, FieldErrors, FieldValues } from 'react-hook-form';
import { t } from 'i18next';
import { Options } from '../EditCustomer';
import { customerSeesTTC } from '@/utils/priceDisplay';

type FormFieldsName = {
  customerCategory: string;
  vatNumber: string;
  siretNumber: string;
  website: string;
};

type CompanyFieldsProps = {
  customerCategories: Options[];
  /** false : création, ou serveur sans le champ → résultat affiché, pas de choix */
  priceDisplayEditable?: boolean;
  control: any;
  errors: FieldErrors<FormFieldsName>;
  watch: any;
};

/** Affichage des prix vu par le client (utils/priceDisplay). */
const PRICE_DISPLAY_OPTIONS: Options[] = [
  { value: 'auto', label: 'Automatique (selon le secteur)' },
  { value: 'ttc', label: 'TTC' },
  { value: 'ht', label: 'HT' },
];

/** EU countries that use intra-community VAT numbers */
const EU_COUNTRIES = [
  'FR', 'DE', 'IT', 'ES', 'BE', 'NL', 'LU', 'AT', 'PT', 'IE', 'FI', 'SE',
  'DK', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'EE', 'LV', 'LT',
  'MT', 'CY', 'EL', 'GR',
]

const CompanyFields = (props: CompanyFieldsProps) => {
  const { customerCategories, errors, control, watch, priceDisplayEditable = false } = props;
  const selectedCountry: string = watch('country') ?? '';
  const isFrance = selectedCountry === 'FR';
  const isEU = EU_COUNTRIES.includes(selectedCountry);

  const vatLabel = isFrance ? 'N° TVA intracommunautaire' : isEU ? 'N° TVA intracommunautaire' : 'N° identification fiscale';
  const vatPlaceholder = isFrance ? 'FR XX XXXXXXXXX' : isEU ? 'Ex: DE123456789' : 'Tax ID';

  // Ce que le client verra réellement, secteur choisi compris
  const sectorName = customerCategories.find((c) => c.value === watch('customerCategory'))?.label;
  const seesTTC = customerSeesTTC(watch('priceDisplay'), sectorName);

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
        <div className="col-span-1">
          <FormItem
            label="Affichage des prix"
            extra={
              <span className="text-xs text-gray-400">
                {' '}— le client voit les prix {seesTTC ? 'TTC' : 'HT'}
              </span>
            }
          >
            {priceDisplayEditable && (
              <Controller
                name="priceDisplay"
                control={control}
                render={({ field }) => (
                  <Select
                    field={field}
                    options={PRICE_DISPLAY_OPTIONS}
                    isSearchable={false}
                    value={PRICE_DISPLAY_OPTIONS.find((o) => o.value === (field.value || 'auto'))}
                    onChange={(option) =>
                      field.onChange(option?.value === 'ttc' || option?.value === 'ht' ? option.value : null)
                    }
                  />
                )}
              />
            )}
            <p className="text-xs text-gray-400 mt-1">
              Automatique : TTC pour le secteur associatif (clubs, associations), HT sinon.
              {!priceDisplayEditable && ' Réglable sur la fiche une fois le client créé.'}
            </p>
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
