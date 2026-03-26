import AdaptableCard from '@/components/shared/AdaptableCard'
import Input from '@/components/ui/Input'
import { FormItem } from '@/components/ui/Form'
import { Controller, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { t } from 'i18next'
import { Select, Switcher } from '@/components/ui'
import { CustomerFormModel } from './CustomerForm'
import { useRef, useState } from 'react'
import { HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi'

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

const LogoUpload = ({ value, onChange }: { value: File | null | undefined; onChange: (f: File | null) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const preview = value instanceof File ? URL.createObjectURL(value) : null

  const handleFile = (file: File | undefined) => {
    if (file && file.type.startsWith('image/')) onChange(file)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {preview ? (
        <div className="relative inline-flex items-center gap-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 shadow-sm">
            <img src={preview} alt="logo" className="w-full h-full object-contain bg-white dark:bg-gray-700" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[180px] truncate">{value?.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{value ? (value.size / 1024).toFixed(0) + ' Ko' : ''}</p>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Changer
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <HiOutlineX className="w-3 h-3" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFile(e.dataTransfer.files[0])
          }}
          className={`
            flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all
            ${dragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/30'}
          `}
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <HiOutlinePhotograph className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Déposer un logo <span className="text-blue-600">ou parcourir</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG · max 5 Mo</p>
          </div>
        </div>
      )}
    </div>
  )
}

/** EU countries that use intra-community VAT numbers */
const EU_COUNTRIES = [
  'FR', 'DE', 'IT', 'ES', 'BE', 'NL', 'LU', 'AT', 'PT', 'IE', 'FI', 'SE',
  'DK', 'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'EE', 'LV', 'LT',
  'MT', 'CY', 'EL', 'GR',
]

const CustomerFields = (props: CustomerFieldsProps) => {
  const { countries, errors, control, watch, setValue } = props

  const selectedCountry = watch('country') ?? ''
  const isFrance = selectedCountry === 'FR'
  const isEU = EU_COUNTRIES.includes(selectedCountry)

  const vatLabel = isFrance ? 'N° TVA intracommunautaire' : isEU ? 'N° TVA intracommunautaire' : 'N° identification fiscale'
  const vatPlaceholder = isFrance ? 'FR XX XXXXXXXXX' : isEU ? 'N° TVA' : 'Tax ID'

  return (
    <AdaptableCard bordered={false} className="mb-4">
      <h5>{t('cust.customer')}</h5>
      <p className="mb-6">{t('cust.customer_description')}</p>

      <FormItem
        label="Nom du client *"
        invalid={!!errors.name}
        errorMessage={errors.name?.message}
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
        label={t('country')}
        invalid={!!errors.country}
        errorMessage={errors.country?.message}
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

      <div className="flex gap-6">
        <FormItem label="Paiement différé">
          <Controller
            name="deferredPayment"
            control={control}
            render={({ field }) => (
              <Switcher checked={field.value} onChange={(checked) => field.onChange(!checked)} />
            )}
          />
        </FormItem>

        <FormItem label="Accès au catalogue">
          <Controller
            name="catalogAccess"
            control={control}
            render={({ field }) => (
              <Switcher checked={field.value ?? true} onChange={(checked) => field.onChange(!checked)} />
            )}
          />
        </FormItem>
      </div>

      <FormItem label="Logo (optionnel)">
        <Controller
          name="logoFile"
          control={control}
          render={({ field }) => (
            <LogoUpload value={field.value} onChange={(file) => field.onChange(file)} />
          )}
        />
      </FormItem>

      <FormItem label={t('address')} invalid={!!errors.address} errorMessage={errors.address?.message}>
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
          className="w-1/2"
          invalid={!!errors.zipCode}
          errorMessage={errors.zipCode?.message}
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
          className="w-1/2"
          invalid={!!errors.city}
          errorMessage={errors.city?.message}
        >
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <Input {...field} type="text" autoComplete="off" placeholder={t('city')} />
            )}
          />
        </FormItem>
      </div>

      <div className="flex gap-4">
        <FormItem
          label={t('phone')}
          className="w-1/2"
          invalid={!!errors.phoneNumber}
          errorMessage={errors.phoneNumber?.message}
        >
          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder={isFrance ? '06 12 34 56 78' : t('phone')}
              />
            )}
          />
        </FormItem>

        <FormItem
          label={t('email')}
          className="w-1/2"
          invalid={!!errors.email}
          errorMessage={errors.email?.message}
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
