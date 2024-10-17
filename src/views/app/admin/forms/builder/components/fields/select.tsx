import { Select } from '@/components/ui'

function SelectSection({className, label, placeholder, options, value, onChange}: {className: string, label: string, placeholder: string, options: any, value: string, onChange: Function}) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Select options={options} placeholder={placeholder} onChange={(e) => onChange(e)} {...(value && { value })}/>
    </div>
  );
}

export default SelectSection
