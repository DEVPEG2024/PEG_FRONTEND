import { Input } from '@/components/ui'
import { ChangeEventHandler } from 'react'

function ColorSection({className, label, placeholder, value, onChange, disabled = false}: {className: string, label: string, placeholder: string, value: string, onChange: Function, disabled?: boolean}) {
  const onChangeInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange(e.currentTarget.value)
  }
  return (
    <div className={className}>
        <p className="text-sm text-gray-400 mb-2">{label}</p>    
        <Input type="color" value={value ?? "#f96260"} placeholder={placeholder} onChange={onChangeInput} disabled={disabled}/>
    </div>
  )
}

export default ColorSection
