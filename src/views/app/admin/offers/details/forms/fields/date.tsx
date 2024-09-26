import { DatePicker, Input } from '@/components/ui'

function DateSection({className, label, placeholder}: {className: string, label: string, placeholder: string}) {
  return (
    <div className={className}>
        <p className="text-sm text-gray-400 mb-2">{label}</p>    
        <DatePicker  placeholder={placeholder} />
    </div>
  )
}

export default DateSection
