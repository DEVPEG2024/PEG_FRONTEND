import AdaptableCard from '@/components/shared/AdaptableCard';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Controller } from 'react-hook-form';
import Select from '@/components/ui/Select';
import CreatableSelect from 'react-select/creatable';
import { HiOutlineStar, HiOutlineTag, HiOutlineThumbUp, HiOutlineThumbDown } from 'react-icons/hi';
import { ProducerFormModel } from './ProducerForm';

type SkillsFieldsProps = {
  control: any;
  errors: any;
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

const SkillsFields = ({ control, errors }: SkillsFieldsProps) => {
  return (
    <AdaptableCard bordered={false} className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <HiOutlineStar className="text-amber-500 text-xl" />
        <h5>Compétences & Spécialités</h5>
      </div>
      <p className="mb-6 text-gray-500 text-sm">
        Définissez les domaines d'expertise et les labels du producteur.
      </p>

      <FormItem
        label="Catégories de produits maîtrisées"
        className="mb-4"
      >
        <Controller
          name="productCategories"
          control={control}
          render={({ field }) => (
            <Select
              isMulti
              componentAs={CreatableSelect}
              field={field}
              value={(field.value || []).map((v: string) => ({ value: v, label: v }))}
              onChange={(options: any) =>
                field.onChange(options ? options.map((o: any) => o.value) : [])
              }
              options={[]}
              placeholder="Tapez et appuyez sur Entrée pour ajouter..."
              noOptionsMessage={() => 'Tapez pour créer une catégorie'}
            />
          )}
        />
      </FormItem>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormItem label="Points forts">
          <div className="flex items-start gap-2">
            <HiOutlineThumbUp className="text-green-500 mt-2 flex-shrink-0" />
            <Controller
              name="strengths"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  textArea
                  rows={3}
                  placeholder="Ex: Réactivité, qualité premium, délais courts..."
                />
              )}
            />
          </div>
        </FormItem>

        <FormItem label="Points faibles">
          <div className="flex items-start gap-2">
            <HiOutlineThumbDown className="text-red-400 mt-2 flex-shrink-0" />
            <Controller
              name="weaknesses"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  textArea
                  rows={3}
                  placeholder="Ex: Délais longs, MOQ élevé..."
                />
              )}
            />
          </div>
        </FormItem>
      </div>

      <FormItem label="Certifications & Labels">
        <div className="flex items-center gap-2">
          <HiOutlineTag className="text-indigo-500 flex-shrink-0" />
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
        </div>
      </FormItem>
    </AdaptableCard>
  );
};

export default SkillsFields;
