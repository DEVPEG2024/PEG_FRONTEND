import { Input } from '@/components/ui'
import { ChangeEventHandler } from 'react'

function InputSection({ className, label, placeholder, value, onChange }: { className: string, label: string, placeholder: string, value: string, onChange: Function }) {
  const onChangeInput: ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange(e.currentTarget.value)
  }

  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Input placeholder={placeholder} onChange={onChangeInput} {...(value && { value })} />
    </div>
  )
}

export default InputSection
