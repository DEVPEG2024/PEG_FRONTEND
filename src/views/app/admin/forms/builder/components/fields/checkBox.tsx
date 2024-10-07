import { Checkbox } from '@/components/ui'
import { ChangeEventHandler } from 'react';
    
function CheckBoxSection({className, label, options, onChange}: {className: string, label: string, options: any, onChange: Function}) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Checkbox.Group value={[]} onChange={(values) => onChange(values)}>
      {options.map((option: any) => (
          <Checkbox value={option.value} key={option.value}>{option.label}</Checkbox>
        ))}
      </Checkbox.Group>
    </div>
  );
}

export default CheckBoxSection
