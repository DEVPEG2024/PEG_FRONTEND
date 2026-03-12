import AdaptableCard from '@/components/shared/AdaptableCard';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Controller, useWatch } from 'react-hook-form';
import Select from '@/components/ui/Select';
import Switcher from '@/components/ui/Switcher';
import { HiOutlineCurrencyEuro, HiOutlineTag } from 'react-icons/hi';

type PricingFieldsProps = {
  control: any;
  errors: any;
};

const PRICE_RANGE_OPTIONS = [
  { value: 'low', label: '💰 Économique' },
  { value: 'medium', label: '💰💰 Intermédiaire' },
  { value: 'premium', label: '💰💰💰 Premium' },
];

const PricingFields = ({ control, errors }: PricingFieldsProps) => {
  const volumeDiscountAvailable = useWatch({ control, name: 'volumeDiscountAvailable' });

  return (
    <AdaptableCard bordered={false} className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <HiOutlineCurrencyEuro className="text-emerald-500 text-xl" />
        <h5>Tarification</h5>
      </div>
      <p className="mb-6 text-gray-500 text-sm">
        Positionnement tarifaire et conditions de remise.
      </p>

      <FormItem label="Fourchette de prix">
        <Controller
          name="priceRange"
          control={control}
          render={({ field }) => (
            <Select
              field={field}
              options={PRICE_RANGE_OPTIONS}
              placeholder="Choisissez le positionnement"
              value={PRICE_RANGE_OPTIONS.find((o) => o.value === field.value) || null}
              onChange={(option: any) => field.onChange(option?.value || null)}
              isClearable
            />
          )}
        />
      </FormItem>

      <div className="mb-4">
        <FormItem label="Remise sur volume possible">
          <div className="flex items-center gap-3">
            <HiOutlineTag className="text-indigo-400 flex-shrink-0" />
            <Controller
              name="volumeDiscountAvailable"
              control={control}
              render={({ field }) => (
                <Switcher
                  checked={!!field.value}
                  onChange={(checked) => field.onChange(checked)}
                />
              )}
            />
            <span className="text-sm text-gray-500">
              {volumeDiscountAvailable ? 'Oui, remise disponible' : 'Non'}
            </span>
          </div>
        </FormItem>
      </div>

      {volumeDiscountAvailable && (
        <FormItem
          label="Taux de remise sur volume"
          invalid={!!errors.volumeDiscountRate}
          errorMessage={errors.volumeDiscountRate?.message}
        >
          <Controller
            name="volumeDiscountRate"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={0}
                max={100}
                placeholder="Ex: 10"
                suffix="%"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            )}
          />
        </FormItem>
      )}
    </AdaptableCard>
  );
};

export default PricingFields;
