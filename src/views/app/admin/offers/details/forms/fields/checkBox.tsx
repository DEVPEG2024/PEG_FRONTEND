import { Checkbox } from '@/components/ui';

function CheckBoxSection({
  className,
  label,
  placeholder,
  options,
}: {
  className: string;
  label: string;
  placeholder: string;
  options: any;
}) {
  console.log(options);
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Checkbox.Group
        value={[]}
        onChange={(values) => console.log('onChange', values)}
      >
        {options.map((option: any) => (
          <Checkbox value={option.value} key={option.value}>
            {option.label}
          </Checkbox>
        ))}
      </Checkbox.Group>
    </div>
  );
}

export default CheckBoxSection;
