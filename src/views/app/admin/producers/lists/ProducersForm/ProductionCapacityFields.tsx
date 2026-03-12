import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Controller } from 'react-hook-form';
import Select from '@/components/ui/Select';
import {
  HiOutlineTruck,
  HiOutlineClock,
  HiOutlineGlobe,
  HiOutlineChartBar,
} from 'react-icons/hi';

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
    <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <HiOutlineTruck className="text-white text-xl" />
          </div>
          <div>
            <h5 className="text-white font-semibold m-0">Capacité de Production</h5>
            <p className="text-blue-100 text-sm m-0">
              Volumes, délais et zones de livraison.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Quantités */}
        <div className="flex items-center gap-2 pb-1">
          <HiOutlineChartBar className="text-blue-500" />
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            Volumes de commande
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem
            label="Quantité minimale"
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
            label="Quantité maximale / mois"
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

        {/* Délais */}
        <div className="flex items-center gap-2 pt-2 pb-1 border-t border-gray-100">
          <HiOutlineClock className="text-blue-500" />
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            Délais de livraison
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem
            label="Délai standard"
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
            label="Délai express"
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

        {/* Zone */}
        <div className="flex items-center gap-2 pt-2 pb-1 border-t border-gray-100">
          <HiOutlineGlobe className="text-blue-500" />
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            Zone de livraison
          </span>
        </div>

        <FormItem className="mb-0">
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
        </FormItem>
      </div>
    </div>
  );
};

export default ProductionCapacityFields;
