import { FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Controller, FieldErrors } from 'react-hook-form';
import { t } from 'i18next';
import {
  HiOutlineBriefcase,
  HiOutlineIdentification,
  HiOutlineGlobe,
} from 'react-icons/hi';
import { Options } from '../EditProducer';

type FormFieldsName = {
  producerCategory: string;
  vatNumber: string;
  siretNumber: string;
  website: string;
};

type CompanyFieldsProps = {
  producerCategories: Options[];
  control: any;
  errors: FieldErrors<FormFieldsName>;
  watch: any;
};

const CompanyFields = (props: CompanyFieldsProps) => {
  const { producerCategories, errors, control, watch } = props;
  const values = watch();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-violet-100 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <HiOutlineBriefcase className="text-white text-xl" />
          </div>
          <div>
            <h5 className="text-white font-semibold m-0">{t('p.organization')}</h5>
            <p className="text-violet-100 text-sm m-0">{t('p.organization_description')}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        <FormItem
          label={t('category')}
          invalid={!!errors.producerCategory}
          errorMessage={errors.producerCategory?.message}
        >
          <Controller
            name="producerCategory"
            control={control}
            render={({ field }) => (
              <Select
                field={field}
                options={producerCategories}
                placeholder="Choisissez la catégorie"
                value={producerCategories.find((o) => field.value === o.value)}
                onChange={(option) => field.onChange(option?.value)}
              />
            )}
          />
        </FormItem>

        {/* Légal */}
        <div className="flex items-center gap-2 pt-2 pb-1 border-t border-gray-100">
          <HiOutlineIdentification className="text-violet-400" />
          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide">
            Informations légales
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormItem
            label="N° TVA"
            invalid={!!errors.vatNumber}
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
                  placeholder="FR 00 000 000 000"
                />
              )}
            />
          </FormItem>
          <FormItem
            label="N° SIRET"
            invalid={!!errors.siretNumber}
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
                  placeholder="000 000 000 00000"
                />
              )}
            />
          </FormItem>
        </div>

        {/* Web */}
        <div className="flex items-center gap-2 pt-2 pb-1 border-t border-gray-100">
          <HiOutlineGlobe className="text-violet-400" />
          <span className="text-xs font-semibold text-violet-500 uppercase tracking-wide">
            Présence en ligne
          </span>
        </div>

        <FormItem
          label="Site internet"
          invalid={!!errors.website}
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
                placeholder="https://www.exemple.fr"
              />
            )}
          />
        </FormItem>
      </div>
    </div>
  );
};

export default CompanyFields;
