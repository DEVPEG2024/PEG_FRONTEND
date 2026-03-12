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
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`text-2xl transition-all duration-150 hover:scale-110 ${
            value !== null && value >= star
              ? 'text-amber-400 drop-shadow-sm'
              : 'text-gray-200 hover:text-amber-300'
          }`}
        >
          ★
        </button>
      ))}
      {value !== null && (
        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
          {value}/5
        </span>
      )}
    </div>
  );
};

const QualityFields = ({ control, errors }: QualityFieldsProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-green-100 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-500 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <HiOutlineShieldCheck className="text-white text-xl" />
          </div>
          <div>
            <h5 className="text-white font-semibold m-0">Qualité & Fiabilité</h5>
            <p className="text-green-100 text-sm m-0">
              Évaluation de la fiabilité et satisfaction client.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Note de fiabilité */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <HiOutlineStar className="text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
              Note de fiabilité
            </span>
          </div>
          <Controller
            name="reliabilityScore"
            control={control}
            render={({ field }) => (
              <StarRating value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 pb-1">
          <HiOutlineEmojiHappy className="text-green-500" />
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
            Statistiques
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem
            label="Satisfaction client"
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
            label="Commandes réalisées"
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

        {/* Commentaires */}
        <div className="flex items-center gap-2 pt-2 pb-1 border-t border-gray-100">
          <HiOutlineChatAlt className="text-green-500" />
          <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">
            Commentaires internes
          </span>
        </div>

        <FormItem className="mb-0">
          <div className="relative">
            <div className="absolute top-2 left-3 z-10">
              <HiOutlineChatAlt className="text-gray-400" />
            </div>
            <Controller
              name="internalComments"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  textArea
                  rows={4}
                  className="pl-8"
                  placeholder="Notes internes sur le producteur (non visibles par le producteur)..."
                />
              )}
            />
          </div>
        </FormItem>
      </div>
    </div>
  );
};

export default QualityFields;
