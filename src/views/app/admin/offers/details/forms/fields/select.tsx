import { Select } from '@/components/ui';

function SelectSection({
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
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Select
        options={options}
        placeholder={placeholder}
        onChange={(e) => console.log(e)}
      />
    </div>
  );
}

export default SelectSection;
