import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { FormContainer } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import StickyFooter from '@/components/shared/StickyFooter'
import CustomerFields from './CustomerFields'
import CompanyFields from './CompanyFields'
import cloneDeep from 'lodash/cloneDeep'
import { AiOutlineSave } from 'react-icons/ai'
import * as Yup from 'yup'
import { t } from 'i18next'
import { countries } from '@/constants/countries.constant'
import { Options } from '../EditCustomer'
import { Customer } from '@/@types/customer'

export type CustomerFormModel = Omit<
  Customer,
  'banner' | 'customerCategory' | 'orderItems' | 'companyInformations'
> & {
  banner: string | null
  customerCategory: string | null

  // champs existants
  email: string
  phoneNumber: string
  vatNumber: string
  siretNumber: string
  address: string
  zipCode: string
  city: string
  country: string
  website: string

  // ✅ NOUVEAU : upload logo
  logoFile?: File | null
}

type CustomerFormProps = {
  initialData?: CustomerFormModel
  customerCategories: Options[]
  onDiscard?: () => void

  // ✅ on submit = FormData (pour envoyer le fichier)
  onFormSubmit: (formData: FormData) => void
}

const validationSchema = Yup.object().shape({
  website: Yup.string(),
  siretNumber: Yup.string().required(t('cust.error.siretNumber')),
  vatNumber: Yup.string().required(t('cust.error.vatNumber')),
  customerCategory: Yup.string().required(t('cust.error.customerCategory')),
  name: Yup.string().required(t('cust.error.name')),
  address: Yup.string().required(t('cust.error.address')),
  zipCode: Yup.string().required(t('cust.error.zipCode')),
  city: Yup.string().required(t('cust.error.city')),
  country: Yup.string().required(t('cust.error.country')),
  email: Yup.string()
    .email(t('cust.error.invalidEmail'))
    .required(t('cust.error.email')),
  phoneNumber: Yup.string()
    .matches(/^0[1-9](?: [0-9]{2}){4}$/, 'Numéro de téléphone invalide')
    .required(t('cust.error.phoneNumber')),

  // ✅ logo facultatif
  logoFile: Yup.mixed<File>().nullable().notRequired(),
})

const CustomerForm = (props: CustomerFormProps) => {
  const { initialData, onFormSubmit, onDiscard, customerCategories } = props

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CustomerFormModel>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: {
      ...(initialData || ({} as CustomerFormModel)),
      logoFile: initialData?.logoFile ?? null,
    },
  })

  const onSubmit = async (values: CustomerFormModel) => {
    const v = cloneDeep(values)

    // ✅ FormData pour multipart
    const fd = new FormData()

    // Champs texte (sécurisé)
    const safeAppend = (key: string, value: any) => {
      if (value === undefined || value === null) return
      fd.append(key, String(value))
    }

    safeAppend('name', v.name)
    safeAppend('deferredPayment', v.deferredPayment)
    safeAppend('address', v.address)
    safeAppend('zipCode', v.zipCode)
    safeAppend('city', v.city)
    safeAppend('country', v.country)
    safeAppend('phoneNumber', v.phoneNumber)
    safeAppend('email', v.email)
    safeAppend('website', v.website)
    safeAppend('siretNumber', v.siretNumber)
    safeAppend('vatNumber', v.vatNumber)

    // customerCategory peut être un id/string selon ton API
    safeAppend('customerCategory', v.customerCategory)

    // ✅ fichier logo
    if (v.logoFile instanceof File) {
      fd.append('logo', v.logoFile)
    }

    // Simule une latence (comme ton code)
    await new Promise((resolve) => setTimeout(resolve, 400))

    onFormSubmit(fd)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormContainer>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2">
            <CustomerFields
              errors={errors}
              control={control}
              countries={countries}
              watch={watch}
              setValue={setValue}
            />
          </div>
          <div className="lg:col-span-2">
            <CompanyFields
              control={control}
              errors={errors as any}
              customerCategories={customerCategories}
              watch={watch}
            />
          </div>
        </div>

        <StickyFooter
          className="-mx-8 px-8 flex items-center justify-end py-4"
          stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <div className="md:flex items-end">
            <Button
              size="sm"
              className="ltr:mr-3 rtl:ml-3"
              type="button"
              onClick={() => onDiscard?.()}
            >
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              variant="solid"
              loading={isSubmitting}
              icon={<AiOutlineSave />}
              type="submit"
            >
              {t('save')}
            </Button>
          </div>
        </StickyFooter>
      </FormContainer>
    </form>
  )
}

export default CustomerForm