import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Controller, useWatch } from 'react-hook-form';
import Select from '@/components/ui/Select';
import Switcher from '@/components/ui/Switcher';
import { HiOutlineCurrencyEuro, HiOutlineTag, HiOutlineChartBar } from 'react-icons/hi';

type PricingFieldsProps = {
  control: any;
  errors: any;
};

const PRICE_RANGE_OPTIONS = [
  { value: 'low', label: '💰 Économique' },
  { value: 'medium', label: '💰💰 Intermédiaire' },
  { value: 'premium', label: '💰💰💰 Premium' },
];

const PRICE_RANGE_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  premium: 'bg-purple-100 text-purple-700 border-purple-200',
};

const PricingFields = ({ control, errors }: PricingFieldsProps) => {
  const volumeDiscountAvailable = useWatch({ control, name: 'volumeDiscountAvailable' });
  const priceRange = useWatch({ control, name: 'priceRange' });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <HiOutlineCurrencyEuro className="text-white text-xl" />
          </div>
          <div>
            <h5 className="text-white font-semibold m-0">Tarification</h5>
            <p className="text-emerald-100 text-sm m-0">
              Positionnement tarifaire et conditions de remise.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Fourchette de prix */}
        <div className="flex items-center gap-2 pb-1">
          <HiOutlineChartBar className="text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
            Positionnement tarifaire
          </span>
        </div>

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

        {priceRange && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${PRICE_RANGE_COLORS[priceRange] || ''}`}
          >
            <HiOutlineCurrencyEuro />
            {PRICE_RANGE_OPTIONS.find((o) => o.value === priceRange)?.label}
          </div>
        )}

        {/* Remises */}
        <div className="flex items-center gap-2 pt-2 pb-1 border-t border-gray-100">
          <HiOutlineTag className="text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
            Remise sur volume
          </span>
        </div>

        <div
          className={`rounded-lg border p-4 transition-colors ${
            volumeDiscountAvailable
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <FormItem label="Remise sur volume possible" className="mb-0">
            <div className="flex items-center gap-3">
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
              <span
                className={`text-sm font-medium ${
                  volumeDiscountAvailable ? 'text-emerald-600' : 'text-gray-400'
                }`}
              >
                {volumeDiscountAvailable ? '✓ Remise disponible' : 'Non disponible'}
              </span>
            </div>
          </FormItem>

          {volumeDiscountAvailable && (
            <div className="mt-4">
              <FormItem
                label="Taux de remise"
                invalid={!!errors.volumeDiscountRate}
                errorMessage={errors.volumeDiscountRate?.message}
                className="mb-0"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingFields;
