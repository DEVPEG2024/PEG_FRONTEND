import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik'
import { IUser } from '@/@types/user'
import { t } from 'i18next'
import { Select } from '@/components/ui'
type country = {
    label: string
    dialCode: string
    value: string
}

type BasicInformationFields = {
    countries: country[]
    touched: FormikTouched<IUser>
    errors: FormikErrors<IUser>
}


const BasicInformationFields = (props: BasicInformationFields) => {
    const { countries, touched, errors} = props

    return (
      <AdaptableCard className="mb-4">
        <h5>{t("cust.organization")}</h5>
        <p className="mb-6">{t("cust.organization_description")}</p>
        <div className="flex gap-4">
        <FormItem
            label="Nom de l'entreprise"
            className="w-full"
            invalid={(errors.companyName && touched.companyName) as boolean}
            errorMessage={errors.companyName}
          >
            <Field
              type="text"
              autoComplete="off"
              name="companyName"
              placeholder="Nom de l'entreprise"
              component={Input}
            />
          </FormItem>
        </div>
        <div className="flex  gap-4">
        
          <FormItem
            label="Nom"
            className="w-1/2"
            invalid={(errors.lastName && touched.lastName) as boolean}
            errorMessage={errors.lastName}
          >
            <Field
              type="text"
              autoComplete="off"
              name="lastName"
              placeholder={t("lastname")}
              component={Input}
            />
          </FormItem>
          <FormItem
            label={t("firstname")}
            className="w-1/2"
            invalid={(errors.firstName && touched.firstName) as boolean}
            errorMessage={errors.firstName}
          >
            <Field
              type="text"
              autoComplete="off"
              name="firstName"
              placeholder={t("firstname")}
              component={Input}
            />
          </FormItem>
        </div>
        <FormItem
          label={t("address")}
          invalid={(errors.address && touched.address) as boolean}
          errorMessage={errors.address}
        >
          <Field
            type="text"
            autoComplete="off"
            name="address"
            placeholder={t("address")}
            component={Input}
          />
        </FormItem>
        <div className="flex gap-4">
          <FormItem
            label={t("zip")}
            className="w-1/3"
            invalid={(errors.zip && touched.zip) as boolean}
            errorMessage={errors.zip}
          >
            <Field
              type="text"
              autoComplete="off"
              name="zip"
              placeholder={t("zip")}
              component={Input}
            />
          </FormItem>
          <FormItem
            label={t("city")}
            className="w-1/3"
            invalid={(errors.city && touched.city) as boolean}
            errorMessage={errors.city}
          >
            <Field
              type="text"
              autoComplete="off"
              name="city"
              placeholder={t("city")}
              component={Input}
            />
          </FormItem>
          <FormItem
            label={t("country")}
            className="w-1/3"
            invalid={(errors.country && touched.country) as boolean}
            errorMessage={errors.country}
          >
            <Field name="country">
              {({ field, form }: FieldProps) => (
                <Select
                  field={field}
                  form={form}
                  options={countries}
                  placeholder="Choisissez le pays"
                  value={countries.filter(
                    (country) => country.value === field.value
                  )}
                  onChange={(option) =>
                    form.setFieldValue(field.name, option?.value)
                  }
                />
              )}
            </Field>
          </FormItem>
        </div>
        <div className="flex gap-4">
          <FormItem
            label={t("phone")}
            className="w-1/2"
            invalid={(errors.phone && touched.phone) as boolean}
            errorMessage={errors.phone}
          >
            <Field
              type="text"
              autoComplete="off"
              name="phone"
              placeholder={t("phone")}
              component={Input}
            />
          </FormItem>
          <FormItem
            label={t("email")}
            className="w-1/2"
            invalid={(errors.email && touched.email) as boolean}
            errorMessage={errors.email}
          >
            <Field
              type="text"
              autoComplete="off"
              name="email"
              placeholder={t("email")}
              component={Input}
            />
          </FormItem>
        </div>
       
      </AdaptableCard>
    );
}

export default BasicInformationFields
