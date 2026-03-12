import AdaptableCard from '@/components/shared/AdaptableCard';
import { FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Controller, FieldErrors } from 'react-hook-form';
import { t } from 'i18next';
import { HiOutlineBriefcase } from 'react-icons/hi';
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
    <AdaptableCard bordered={false} className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <HiOutlineBriefcase className="text-violet-500 text-xl" />
        <h5>{t('p.organization')}</h5>
      </div>
      <p className="mb-6">{t('p.organization_description')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1">
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1">
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
        </div>
        <div className="col-span-1">
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
        <div className="col-span-2">
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
    </AdaptableCard>
  );
};

export default CompanyFields;
