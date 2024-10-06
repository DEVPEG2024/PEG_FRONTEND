import { Radio } from '@/components/ui'

function RadioSection({className, label, placeholder, options}: {className: string, label: string, placeholder: string, options: any}) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Radio.Group>
        {options.map((option: any) => (
          <Radio value={option.value} key={option.value}>{option.label}</Radio>
        ))}
      </Radio.Group>
    </div>
  );
}

export default RadioSection
