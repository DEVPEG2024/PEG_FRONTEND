import { Checkbox } from '@/components/ui'
import { ChangeEventHandler } from 'react';

function CheckBoxSection({ className, label, options, value, onChange }: { className: string, label: string, options: any, value: string, onChange: Function }) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Checkbox.Group value={value ? [value] : []} onChange={(values) => onChange(values)} >
        {options.map((option: any) => (
          <Checkbox value={option.value} key={option.value}>{option.label}</Checkbox>
        ))}
      </Checkbox.Group>
    </div>
  );
}

export default CheckBoxSection
