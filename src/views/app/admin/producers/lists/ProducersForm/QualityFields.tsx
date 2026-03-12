import AdaptableCard from '@/components/shared/AdaptableCard';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Controller } from 'react-hook-form';
import {
  HiOutlineShieldCheck,
  HiOutlineStar,
  HiOutlineEmojiHappy,
  HiOutlineClipboardList,
  HiOutlineChatAlt,
} from 'react-icons/hi';

type QualityFieldsProps = {
  control: any;
  errors: any;
};

const StarRating = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition-colors ${
            value !== null && value >= star
              ? 'text-amber-400'
              : 'text-gray-300 hover:text-amber-300'
          }`}
        >
          ★
        </button>
      ))}
      {value !== null && (
        <span className="ml-2 text-sm text-gray-500 self-center">{value}/5</span>
      )}
    </div>
  );
};

const QualityFields = ({ control, errors }: QualityFieldsProps) => {
  return (
    <AdaptableCard bordered={false} className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <HiOutlineShieldCheck className="text-green-500 text-xl" />
        <h5>Qualité & Fiabilité</h5>
      </div>
      <p className="mb-6 text-gray-500 text-sm">
        Évaluez la fiabilité et la satisfaction client du producteur.
      </p>

      <FormItem label="Note de fiabilité">
        <div className="flex items-center gap-2">
          <HiOutlineStar className="text-amber-400 flex-shrink-0" />
          <Controller
            name="reliabilityScore"
            control={control}
            render={({ field }) => (
              <StarRating value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      </FormItem>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormItem
          label="Taux de satisfaction client"
          invalid={!!errors.customerSatisfactionRate}
          errorMessage={errors.customerSatisfactionRate?.message}
        >
          <div className="flex items-center gap-2">
            <HiOutlineEmojiHappy className="text-green-400 flex-shrink-0" />
            <Controller
              name="customerSatisfactionRate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Ex: 95"
                  suffix="%"
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
          label="Nombre de commandes réalisées"
          invalid={!!errors.completedOrdersCount}
          errorMessage={errors.completedOrdersCount?.message}
        >
          <div className="flex items-center gap-2">
            <HiOutlineClipboardList className="text-blue-400 flex-shrink-0" />
            <Controller
              name="completedOrdersCount"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min={0}
                  placeholder="Ex: 42"
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

      <FormItem label="Commentaires internes">
        <div className="flex items-start gap-2">
          <HiOutlineChatAlt className="text-gray-400 mt-2 flex-shrink-0" />
          <Controller
            name="internalComments"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                textArea
                rows={4}
                placeholder="Notes internes sur le producteur (non visibles par le producteur)..."
              />
            )}
          />
        </div>
      </FormItem>
    </AdaptableCard>
  );
};

export default QualityFields;
