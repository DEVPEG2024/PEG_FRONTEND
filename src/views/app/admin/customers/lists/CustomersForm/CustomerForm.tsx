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
  email: string
  phoneNumber: string
  vatNumber: string
  siretNumber: string
  address: string
  zipCode: string
  city: string
  country: string
  website: string

  // ✅ nouveau: fichier logo
  logoFile?: File | null
}

type CustomerFormProps = {
  initialData?: CustomerFormModel
  customerCategories: Options[]
  onDiscard?: () => void
  onFormSubmit: (formData: CustomerFormModel) => void
  extraContent?: React.ReactNode
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required('Le nom du client est obligatoire'),
  email: Yup.string().email('Email invalide').nullable(),
  phoneNumber: Yup.string().nullable(),
  address: Yup.string().nullable(),
  zipCode: Yup.string().nullable(),
  city: Yup.string().nullable(),
  country: Yup.string().nullable(),
  customerCategory: Yup.string().nullable(),
  vatNumber: Yup.string().nullable(),
  siretNumber: Yup.string().nullable(),
  website: Yup.string().nullable(),
  logoFile: Yup.mixed().nullable(),
})

const CustomerForm = (props: CustomerFormProps) => {
  const { initialData, onFormSubmit, onDiscard, customerCategories, extraContent } = props

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CustomerFormModel>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: initialData,
  })

  const onSubmit = async (values: CustomerFormModel) => {
    const formData = cloneDeep(values)
    await new Promise((resolve) => setTimeout(resolve, 300))
    onFormSubmit(formData)
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

        {extraContent}

        <StickyFooter
          className="-mx-8 px-8 flex items-center justify-end py-4"
          stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <div className="md:flex items-end">
            <Button size="sm" className="ltr:mr-3 rtl:ml-3" type="button" onClick={() => onDiscard?.()}>
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