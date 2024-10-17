import { DatePicker } from '@/components/ui'

function DateSection({className, label, placeholder, value, onChange}: {className: string, label: string, placeholder: string, value: string, onChange: Function}) {
  return (
    <div className={className}>
        <p className="text-sm text-gray-400 mb-2">{label}</p>    
        <DatePicker  placeholder={placeholder} onChange={(e) => onChange(e)} {...(value && { value: new Date(value) })}/>
    </div>
  )
}

export default DateSection
