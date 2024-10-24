import { Checkbox } from '@/components/ui';

function CheckBoxSection({ className, label, options, value, onChange, disabled = false }: { className: string, label: string, options: any, value: string[], onChange: Function, disabled?: boolean }) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Checkbox.Group value={value ?? []} onChange={(values) => onChange(values)} >
        {options.map((option: any) => (
          <Checkbox value={option.value} key={option.value} disabled={disabled}>{option.label}</Checkbox>
        ))}
      </Checkbox.Group>
    </div>
  );
}

export default CheckBoxSection
