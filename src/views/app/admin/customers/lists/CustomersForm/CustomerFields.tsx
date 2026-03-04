import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Controller, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { t } from 'i18next'
import { Select, Switcher } from '@/components/ui'
import { CustomerFormModel } from './CustomerForm'
import { useMemo } from 'react'

type country = {
  label: string
  dialCode: string
  value: string
}

type CustomerFieldsProps = {
  countries: country[]
  errors: FieldErrors<CustomerFormModel>
  control: any
  watch: UseFormWatch<CustomerFormModel>
  setValue: UseFormSetValue<CustomerFormModel>
}

const CustomerFields = (props: CustomerFieldsProps) => {
  const { countries, errors, control, watch, setValue } = props
  const values = watch()

  const previewUrl = useMemo(() => {
    if (!values.logoFile) return null
    return URL.createObjectURL(values.logoFile)
  }, [values.logoFile])

  const formatPhoneNumber = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '')
    return digitsOnly
      .slice(0, 10)
      .replace(/(\d{2})(?=\d)/g, '$1 ')
      .trim()
  }

  return (
    <AdaptableCard bordered={false} className="mb-4">
      <h5>{t('cust.customer')}</h5>
      <p className="mb-6">{t('cust.customer_description')}</p>

      {/* ✅ LOGO */}
      <FormItem label="Logo du client">
        <Controller
          name="logoFile"
          control={control}
          render={() => (
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setValue('logoFile', file as any, { shouldDirty: true })
                }}
              />
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="logo preview"
                  className="h-12 w-12 rounded object-cover"
                />
              )}
            </div>
          )}
        />
      </FormItem>

      <div className="flex gap-4">
        <FormItem
          label="Nom du client"
          className="w-2/3"
          invalid={!!errors.name}
          errorMessage={errors.name?.message as any}
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" autoComplete="off" placeholder="Nom du client" />
            )}
          />
        </FormItem>

        <FormItem
          label="Paiment différé"
          invalid={!!errors.deferredPayment}
          errorMessage={errors.deferredPayment?.message as any}
        >
          <Controller
            name="deferredPayment"
            control={control}
            render={({ field }) => (
              <Switcher checked={field.value} onChange={() => field.onChange(!field.value)} />
            )}
          />
        </FormItem>
      </div>

      <FormItem
        label={t('address')}
        invalid={!!errors.address}
        errorMessage={errors.address?.message as any}
      >
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <Input {...field} type="text" autoComplete="off" placeholder={t('address')} />
          )}
        />
      </FormItem>

      <div className="flex gap-4">
        <FormItem
          label={t('zipCode')}
          className="w-1/3"
          invalid={!!errors.zipCode}
          errorMessage={errors.zipCode?.message as any}
        >
          <Controller
            name="zipCode"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" autoComplete="off" placeholder={t('zipCode')} />
            )}
          />
        </FormItem>

        <FormItem
          label={t('city')}
          className="w-1/3"
          invalid={!!errors.city}
          errorMessage={errors.city?.message as any}
        >
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" autoComplete="off" placeholder={t('city')} />
            )}
          />
        </FormItem>

        <FormItem
          label={t('country')}
          className="w-1/3"
          invalid={!!errors.country}
          errorMessage={errors.country?.message as any}
        >
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <Select
                field={field}
                options={countries}
                placeholder="Choisissez le pays"
                value={countries.filter((c) => c.value === field.value)}
                onChange={(option) => field.onChange(option?.value)}
              />
            )}
          />
        </FormItem>
      </div>

      <div className="flex gap-4">
        <FormItem
          label={t('phone')}
          className="w-1/2"
          invalid={!!errors.phoneNumber}
          errorMessage={errors.phoneNumber?.message as any}
        >
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder={t('phone')}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  field.onChange(formatPhoneNumber(e.target.value))
                }}
              />
            )}
          />
        </FormItem>

        <FormItem
          label={t('email')}
          className="w-1/2"
          invalid={!!errors.email}
          errorMessage={errors.email?.message as any}
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" autoComplete="off" placeholder={t('email')} />
            )}
          />
        </FormItem>
      </div>
    </AdaptableCard>
  )
}

export default CustomerFields