import { Radio } from '@/components/ui'

function RadioSection({className, label, options, value, onChange}: {className: string, label: string, options: any, value: string, onChange: Function}) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Radio.Group onChange={(values) => onChange(values)} {...(value && { value })}>
        {options.map((option: any) => (
          <Radio value={option.value} key={option.value}>{option.label}</Radio>
        ))}
      </Radio.Group>
    </div>
  );
}

export default RadioSection
