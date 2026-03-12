import AdaptableCard from '@/components/shared/AdaptableCard';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Controller } from 'react-hook-form';
import Select from '@/components/ui/Select';
import { HiOutlineTruck, HiOutlineClock, HiOutlineGlobe } from 'react-icons/hi';

type ProductionCapacityFieldsProps = {
  control: any;
  errors: any;
};

const DELIVERY_ZONE_OPTIONS = [
  { value: 'regional', label: '📍 Régionale' },
  { value: 'national', label: '🇫🇷 Nationale' },
  { value: 'international', label: '🌍 Internationale' },
];

const ProductionCapacityFields = ({ control, errors }: ProductionCapacityFieldsProps) => {
  return (
    <AdaptableCard bordered={false} className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <HiOutlineTruck className="text-blue-500 text-xl" />
        <h5>Capacité de Production</h5>
      </div>
      <p className="mb-6 text-gray-500 text-sm">
        Renseignez les capacités de production et les délais de livraison.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormItem
          label="Quantité minimale de commande"
          invalid={!!errors.minOrderQuantity}
          errorMessage={errors.minOrderQuantity?.message}
        >
          <Controller
            name="minOrderQuantity"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={0}
                placeholder="Ex: 100"
                suffix="unités"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            )}
          />
        </FormItem>

        <FormItem
          label="Quantité maximale par mois"
          invalid={!!errors.maxMonthlyQuantity}
          errorMessage={errors.maxMonthlyQuantity?.message}
        >
          <Controller
            name="maxMonthlyQuantity"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={0}
                placeholder="Ex: 10 000"
                suffix="unités"
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
              />
            )}
          />
        </FormItem>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormItem
          label="Délai de livraison moyen"
          invalid={!!errors.averageDeliveryDays}
          errorMessage={errors.averageDeliveryDays?.message}
        >
          <div className="flex items-center gap-2">
            <HiOutlineClock className="text-gray-400 flex-shrink-0" />
            <Controller
              name="averageDeliveryDays"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min={0}
                  placeholder="Ex: 14"
                  suffix="jours"
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              )}
            />
          </div>
        </FormItem>

        <FormItem
          label="Délai de livraison express"
          invalid={!!errors.expressDeliveryDays}
          errorMessage={errors.expressDeliveryDays?.message}
        >
          <div className="flex items-center gap-2">
            <HiOutlineClock className="text-orange-400 flex-shrink-0" />
            <Controller
              name="expressDeliveryDays"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min={0}
                  placeholder="Ex: 5"
                  suffix="jours"
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              )}
            />
          </div>
        </FormItem>
      </div>

      <FormItem label="Zone de livraison">
        <div className="flex items-center gap-2">
          <HiOutlineGlobe className="text-green-500 flex-shrink-0" />
          <Controller
            name="deliveryZone"
            control={control}
            render={({ field }) => (
              <Select
                field={field}
                options={DELIVERY_ZONE_OPTIONS}
                placeholder="Choisissez la zone"
                value={DELIVERY_ZONE_OPTIONS.find((o) => o.value === field.value) || null}
                onChange={(option: any) => field.onChange(option?.value || null)}
                isClearable
              />
            )}
          />
        </div>
      </FormItem>
    </AdaptableCard>
  );
};

export default ProductionCapacityFields;
