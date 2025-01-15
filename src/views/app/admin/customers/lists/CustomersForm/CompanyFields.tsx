import AdaptableCard from '@/components/shared/AdaptableCard';
import { FormItem } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik';
import { t } from 'i18next';
import { Options } from '../EditCustomer';

type FormFieldsName = {
  customerCategory: string;
  vatNumber: string;
  siretNumber: string;
  website: string;
};

type CompanyFieldsProps = {
  customerCategories: Options[];
  touched: FormikTouched<FormFieldsName>;
  errors: FormikErrors<FormFieldsName>;
  values: FormFieldsName;
};

const CompanyFields = (props: CompanyFieldsProps) => {
  const { customerCategories, errors } = props;

  return (
    <AdaptableCard className="mb-4">
      <h5>{t('cust.organization')}</h5>
      <p className="mb-6">{t('cust.company_description')}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1">
          <FormItem
            label={t('category')}
            invalid={errors.customerCategory ? true : false}
            errorMessage={errors.customerCategory}
          >
            <Field name="customerCategory">
              {({ field, form }: FieldProps) => (
                <Select
                  field={field}
                  form={form}
                  options={customerCategories}
                  placeholder="Choisissez la catégorie"
                  value={customerCategories.find((option) => {
                    return field.value === option.value;
                  })}
                  onChange={(option) =>
                    form.setFieldValue(field.name, option?.value)
                  }
                />
              )}
            </Field>
          </FormItem>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1">
          <FormItem
            label="N° TVA"
            invalid={errors.vatNumber ? true : false}
            errorMessage={errors.vatNumber}
          >
            <Field
              type="text"
              autoComplete="off"
              name="vatNumber"
              placeholder="N° TVA"
              component={Input}
              value={props.values.vatNumber}
            />
          </FormItem>
        </div>
        <div className="col-span-1">
          <FormItem
            label="N° SIRET"
            invalid={errors.siretNumber ? true : false}
            errorMessage={errors.siretNumber}
          >
            <Field
              type="text"
              autoComplete="off"
              name="siretNumber"
              placeholder="N° SIRET"
              component={Input}
            />
          </FormItem>
        </div>
        <div className="col-span-2">
          <FormItem
            label="Site internet"
            invalid={errors.website ? true : false}
            errorMessage={errors.website}
          >
            <Field
              type="text"
              autoComplete="off"
              name="website"
              placeholder="Site internet"
              component={Input}
            />
          </FormItem>
        </div>
      </div>
    </AdaptableCard>
  );
};

export default CompanyFields;
