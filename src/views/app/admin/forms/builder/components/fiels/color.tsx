import { Input } from '@/components/ui'

function ColorSection({className, label, placeholder}: {className: string, label: string, placeholder: string}) {
  return (
    <div className={className}>
        <p className="text-sm text-gray-400 mb-2">{label}</p>    
        <Input type="color" value="#f96260" placeholder={placeholder} />
    </div>
  )
}

export default ColorSection
