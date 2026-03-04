import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Controller, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { t } from 'i18next'
import { Select, Switcher } from '@/components/ui'
import { CustomerFormModel } from './CustomerForm'
import { useMemo } from 'react'

type Country = { label: string; dialCode: string; value: string }
type Props = {
  countries: Country[]
  errors: FieldErrors<CustomerFormModel>
  control: any
  watch: UseFormWatch<CustomerFormModel>
  setValue: UseFormSetValue<CustomerFormModel>
}

const CustomerFields = ({ countries, errors, control, watch, setValue }: Props) => {
  const logoFile = watch('logoFile')
  const previewUrl = useMemo(() => {
    if (!logoFile) return null
    try { return URL.createObjectURL(logoFile) } catch { return null }
  }, [logoFile])

  const formatPhone = (v: string) =>
    v.replace(/\D/g, '').slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim()

  return (
    <AdaptableCard bordered={false} className="mb-4">
      <h5>{t('cust.customer')}</h5>
      <p className="mb-6">{t('cust.customer_description')}</p>

      <FormItem label="Logo du client">
        <Controller name="logoFile" control={control} render={() => (
          <div className="flex items-center gap-4">
            <input type="file" accept="image/*" className="text-sm"
              onChange={(e) => setValue('logoFile', (e.target.files?.[0] ?? null) as any, { shouldDirty: true })}
            />
            {previewUrl && (
              <img src={previewUrl} alt="Aperçu" className="h-12 w-12 rounded object-cover border border-gray-200" />
            )}
          </div>
        )} />
      </FormItem>

      <div className="flex gap-4">
        <FormItem label="Nom du client" className="w-2/3" invalid={!!errors.name} errorMessage={errors.name?.message as string}>
          <Controller name="name" control={control} render={({ field }) => (
            <Input {...field} type="text" autoComplete="off" placeholder="Nom du client" />
          )} />
        </FormItem>
        <FormItem label="Paiement différé">
          <Controller name="deferredPayment" control={control} render={({ field }) => (
            <Switcher checked={!!field.value} onChange={() => field.onChange(!field.value)} />
          )} />
        </FormItem>
      </div>

      <FormItem label={t('address')} invalid={!!errors.address} errorMessage={errors.address?.message as string}>
        <Controller name="address" control={control} render={({ field }) => (
          <Input {...field} type="text" autoComplete="off" placeholder={t('address')} />
        )} />
      </FormItem>

      <div className="flex gap-4">
        <FormItem label={t('zipCode')} className="w-1/3" invalid={!!errors.zipCode} errorMessage={errors.zipCode?.message as string}>
          <Controller name="zipCode" control={control} render={({ field }) => (
            <Input {...field} type="text" autoComplete="off" placeholder={t('zipCode')} />
          )} />
        </FormItem>
        <FormItem label={t('city')} className="w-1/3" invalid={!!errors.city} errorMessage={errors.city?.message as string}>
          <Controller name="city" control={control} render={({ field }) => (
            <Input {...field} type="text" autoComplete="off" placeholder={t('city')} />
          )} />
        </FormItem>
        <FormItem label={t('country')} className="w-1/3" invalid={!!errors.country} errorMessage={errors.country?.message as string}>
          <Controller name="country" control={control} render={({ field }) => (
            <Select options={countries} placeholder="Pays"
              value={countries.filter((c) => c.value === field.value)}
              onChange={(o: any) => field.onChange(o?.value)}
            />
          )} />
        </FormItem>
      </div>

      <div className="flex gap-4">
        <FormItem label={t('phone')} className="w-1/2" invalid={!!errors.phoneNumber} errorMessage={errors.phoneNumber?.message as string}>
          <Controller name="phoneNumber" control={control} render={({ field }) => (
            <Input {...field} type="text" autoComplete="off" placeholder={t('phone')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(formatPhone(e.target.value))}
            />
          )} />
        </FormItem>
        <FormItem label={t('email')} className="w-1/2" invalid={!!errors.email} errorMessage={errors.email?.message as string}>
          <Controller name="email" control={control} render={({ field }) => (
            <Input {...field} type="text" autoComplete="off" placeholder={t('email')} />
          )} />
        </FormItem>
      </div>
    </AdaptableCard>
  )
}

export default CustomerFields