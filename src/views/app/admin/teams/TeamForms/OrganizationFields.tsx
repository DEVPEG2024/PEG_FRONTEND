import AdaptableCard from '@/components/shared/AdaptableCard'
import { FormItem } from '@/components/ui/Form'
import Select from '@/components/ui/Select'
import CreatableSelect from 'react-select/creatable'
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik'
import { t } from 'i18next'
import { OptionsRole } from '../NewTeam/NewTeam'
import { ROLES_OPTIONS } from '@/constants/roles.constant'

type Options = {
    label: string
    value: string
}[]

type FormFieldsName = {
    authority: string
    tags: Options
    vat: string
    siret: string
    website: string
    description: string
}


type OrganizationFieldsProps = {
    type: string
    categories: OptionsRole[]
    touched: FormikTouched<FormFieldsName>
    errors: FormikErrors<FormFieldsName>
    values: {
        authority: string
        tags: Options
        [key: string]: unknown
    }
}



const tags = [
    { label: 'vip', value: 'vip' },
    { label: 'nouveau', value: 'nouveau' },
]

const OrganizationFields = (props: OrganizationFieldsProps) => {
    const { type, categories, values = { authority: '', tags: [] }, touched, errors } = props

    return (
      <AdaptableCard className="mb-4">
        <h5>{type === 'edit' ? 'Configurer le role' : 'Configurer le role'}</h5>
        <p className="mb-6">{type === 'edit' ? 'Configurer le role' : 'Configurer le role'}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1">
            <FormItem
              label="Catégorie"
            >
              <Field name="authority">
                {({ field, form }: FieldProps) => (
                  <Select
                    field={field}
                    form={form}
                    options={categories}
                    placeholder="Choisissez la catégorie"
                    value={ROLES_OPTIONS.filter(
                      (category) => category.value === values.authority
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
       
      </AdaptableCard>
    );
}

export default OrganizationFields
