import { Radio } from '@/components/ui'

function RadioSection({className, label, options, value, onChange, disabled = false}: {className: string, label: string, options: any, value: string, onChange: Function, disabled?: boolean}) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Radio.Group onChange={(values) => onChange(values)} {...(value && { value })} disabled={disabled}>
        {options.map((option: any) => (
          <Radio value={option.value} key={option.value}>{option.label}</Radio>
        ))}
      </Radio.Group>
    </div>
  );
}

export default RadioSection
