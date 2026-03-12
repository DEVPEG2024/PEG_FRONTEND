import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Controller } from 'react-hook-form';
import Select from '@/components/ui/Select';
import CreatableSelect from 'react-select/creatable';
import {
  HiOutlineStar,
  HiOutlineTag,
  HiOutlineThumbUp,
  HiOutlineThumbDown,
  HiOutlineCollection,
} from 'react-icons/hi';
import { Options } from '../EditProducer';

type SkillsFieldsProps = {
  control: any;
  errors: any;
  productCategoryOptions: Options[];
};

const CERTIFICATION_OPTIONS = [
  { value: 'ISO 9001', label: 'ISO 9001' },
  { value: 'ISO 14001', label: 'ISO 14001' },
  { value: 'ISO 45001', label: 'ISO 45001' },
  { value: 'Bio', label: 'Bio' },
  { value: 'Made in France', label: 'Made in France' },
  { value: 'OEKO-TEX', label: 'OEKO-TEX' },
  { value: 'GOTS', label: 'GOTS' },
  { value: 'Fair Trade', label: 'Fair Trade' },
  { value: 'B Corp', label: 'B Corp' },
  { value: 'NF', label: 'NF' },
  { value: 'CE', label: 'CE' },
  { value: 'FSC', label: 'FSC' },
];

const SkillsFields = ({ control, errors, productCategoryOptions }: SkillsFieldsProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <HiOutlineStar className="text-white text-xl" />
          </div>
          <div>
            <h5 className="text-white font-semibold m-0">Compétences & Spécialités</h5>
            <p className="text-amber-100 text-sm m-0">
              Domaines d'expertise et labels du producteur.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Catégories produits */}
        <div className="flex items-center gap-2 pb-1">
          <HiOutlineCollection className="text-amber-500" />
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Catégories de produits maîtrisées
          </span>
        </div>

        <FormItem className="mb-0">
          <Controller
            name="productCategories"
            control={control}
            render={({ field }) => (
              <Select
                isMulti
                field={field}
                value={(field.value || []).map((v: string) =>
                  productCategoryOptions.find((opt) => opt.value === v) || { value: v, label: v }
                )}
                onChange={(options: any) =>
                  field.onChange(options ? options.map((o: any) => o.value) : [])
                }
                options={productCategoryOptions}
                placeholder="Sélectionner des catégories..."
                noOptionsMessage={() => 'Aucune catégorie disponible'}
              />
            )}
          />
        </FormItem>

        {/* Points forts / faibles */}
        <div className="flex items-center gap-2 pt-2 pb-1 border-t border-gray-100">
          <HiOutlineThumbUp className="text-amber-500" />
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Forces & Faiblesses
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormItem label="Points forts">
            <div className="relative">
              <div className="absolute top-2 left-3 z-10">
                <HiOutlineThumbUp className="text-green-500" />
              </div>
              <Controller
                name="strengths"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    textArea
                    rows={3}
                    className="pl-8"
                    placeholder="Ex: Réactivité, qualité premium, délais courts..."
                  />
                )}
              />
            </div>
          </FormItem>

          <FormItem label="Points faibles">
            <div className="relative">
              <div className="absolute top-2 left-3 z-10">
                <HiOutlineThumbDown className="text-red-400" />
              </div>
              <Controller
                name="weaknesses"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    textArea
                    rows={3}
                    className="pl-8"
                    placeholder="Ex: Délais longs, MOQ élevé..."
                  />
                )}
              />
            </div>
          </FormItem>
        </div>

        {/* Certifications */}
        <div className="flex items-center gap-2 pt-2 pb-1 border-t border-gray-100">
          <HiOutlineTag className="text-amber-500" />
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
            Certifications & Labels
          </span>
        </div>

        <FormItem className="mb-0">
          <Controller
            name="certifications"
            control={control}
            render={({ field }) => (
              <Select
                isMulti
                componentAs={CreatableSelect}
                field={field}
                options={CERTIFICATION_OPTIONS}
                value={(field.value || []).map((v: string) => ({
                  value: v,
                  label: v,
                }))}
                onChange={(options: any) =>
                  field.onChange(options ? options.map((o: any) => o.value) : [])
                }
                placeholder="ISO, Bio, Made in France..."
              />
            )}
          />
        </FormItem>
      </div>
    </div>
  );
};

export default SkillsFields;
