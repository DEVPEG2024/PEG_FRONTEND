import AdaptableCard from '@/components/shared/AdaptableCard'
import { FormItem } from '@/components/ui/Form'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import CreatableSelect from 'react-select/creatable'
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik'
import { ICategoryCustomer } from '@/services/CustomerServices'
import { t } from 'i18next'
import { RichTextEditor } from '@/components/shared'

type Options = {
    label: string
    value: string
}[]

type FormFieldsName = {
    category: string
    tags: Options
    vat: string
    siret: string
    website: string
    description: string
}


type OrganizationFieldsProps = {
    categories: ICategoryCustomer[]
    touched: FormikTouched<FormFieldsName>
    errors: FormikErrors<FormFieldsName>
    values: {
        category: string
        tags: Options
        [key: string]: unknown
    }
}



const tags = [
    { label: 'vip', value: 'vip' },
    { label: 'nouveau', value: 'nouveau' },
]

const OrganizationFields = (props: OrganizationFieldsProps) => {
    const { categories, values = { category: '', tags: [] }, touched, errors } = props

    return (
      <AdaptableCard className="mb-4">
        <h5>{t("cust.organization")}</h5>
        <p className="mb-6">{t("cust.organization_description")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1">
            <FormItem
              label={t("category")}
              invalid={(errors.category && touched.category) as boolean}
              errorMessage={errors.category}
            >
              <Field name="category">
                {({ field, form }: FieldProps) => (
                  <Select
                    field={field}
                    form={form}
                    options={categories}
                    placeholder="Choisissez la catégorie"
                    value={categories.filter(
                      (category) => category.value === values.category
                    )}
                    onChange={(option) =>
                      form.setFieldValue(field.name, option?.value)
                    }
                  />
                )}
              </Field>
            </FormItem>
          </div>
          <div className="col-span-1">
            <FormItem
              label="Tags"
              invalid={(errors.tags && touched.tags) as unknown as boolean}
              errorMessage={errors.tags as string}
            >
              <Field name="tags">
                {({ field, form }: FieldProps) => (
                  <Select
                    isMulti
                    componentAs={CreatableSelect}
                    field={field}
                    form={form}
                    options={tags}
                    placeholder="Choisissez les tags"
                    value={values.tags}
                    onChange={(option) =>
                      form.setFieldValue(field.name, option)
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
              invalid={(errors.vat && touched.vat) as boolean}
              errorMessage={errors.vat}
            >
              <Field
                type="text"
                autoComplete="off"
                name="vat"
                placeholder="N° TVA"
                component={Input}
              />
            </FormItem>
          </div>
          <div className="col-span-1">
            <FormItem
              label="N° SIRET"
              invalid={(errors.siret && touched.siret) as boolean}
              errorMessage={errors.siret}
            >
              <Field
                type="text"
                autoComplete="off"
                name="siret"
                placeholder="N° SIRET"
                component={Input}
              />
            </FormItem>
          </div>
          <div className="col-span-2">
            <FormItem
              label="Site internet"
              invalid={(errors.website && touched.website) as boolean}
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
          <div className="col-span-2">
            <FormItem
              label="Description"
              labelClass="!justify-start"
              invalid={(errors.description && touched.description) as boolean}
              errorMessage={errors.description}
            >
              <Field name="description">
                {({ field, form }: FieldProps) => (
                  <RichTextEditor
                    value={field.value}
                    onChange={(val) => form.setFieldValue(field.name, val)}
                  />
                )}
              </Field>
            </FormItem>
          </div>
        </div>
      </AdaptableCard>
    );
}

export default OrganizationFields
