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

export type CustomerFormModel = {
  name: string
  email: string
  phoneNumber: string
  vatNumber: string
  siretNumber: string
  address: string
  zipCode: string
  city: string
  country: string
  website?: string
  deferredPayment?: boolean
  customerCategory: string | null
  banner?: string | null
  logoFile?: File | null
  [key: string]: any
}

type Options = { label: string; value: string }
type CustomerFormProps = {
  initialData?: Partial<CustomerFormModel>
  customerCategories: Options[]
  onDiscard?: () => void
  onFormSubmit: (payload: { data: CustomerFormModel; logoFile?: File | null }) => void
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required(t('cust.error.name')),
  email: Yup.string().email(t('cust.error.invalidEmail')).required(t('cust.error.email')),
  phoneNumber: Yup.string().required(t('cust.error.phoneNumber')),
  address: Yup.string().required(t('cust.error.address')),
  zipCode: Yup.string().required(t('cust.error.zipCode')),
  city: Yup.string().required(t('cust.error.city')),
  country: Yup.string().required(t('cust.error.country')),
  vatNumber: Yup.string().required(t('cust.error.vatNumber')),
  siretNumber: Yup.string().required(t('cust.error.siretNumber')),
  customerCategory: Yup.string().nullable().required(t('cust.error.customerCategory')),
})

const CustomerForm = ({ initialData, onFormSubmit, onDiscard, customerCategories }: CustomerFormProps) => {
  const { control, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<CustomerFormModel>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: initialData ?? {},
  })

  const onSubmit = async (values: CustomerFormModel) => {
    const formData = cloneDeep(values)
    const logoFile = formData.logoFile ?? null
    delete formData.logoFile
    onFormSubmit({ data: formData, logoFile })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormContainer>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CustomerFields errors={errors} control={control} countries={countries} watch={watch} setValue={setValue} />
          <CompanyFields control={control} errors={errors as any} customerCategories={customerCategories} watch={watch} />
        </div>
        <StickyFooter className="-mx-8 px-8 flex items-center justify-end py-4" stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Button size="sm" type="button" onClick={() => onDiscard?.()}>{t('cancel')}</Button>
            <Button size="sm" variant="solid" loading={isSubmitting} icon={<AiOutlineSave />} type="submit">{t('save')}</Button>
          </div>
        </StickyFooter>
      </FormContainer>
    </form>
  )
}

export default CustomerForm