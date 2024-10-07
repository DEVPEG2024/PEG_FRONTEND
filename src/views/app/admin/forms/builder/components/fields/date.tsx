import { DatePicker, Input } from '@/components/ui'

function DateSection({className, label, placeholder, onChange}: {className: string, label: string, placeholder: string, onChange: Function}) {
  return (
    <div className={className}>
        <p className="text-sm text-gray-400 mb-2">{label}</p>    
        <DatePicker  placeholder={placeholder} onChange={(e) => onChange(e)} />
    </div>
  )
}

export default DateSection
