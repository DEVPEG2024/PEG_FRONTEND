import { Input } from '@/components/ui';

function InputSection({
  className,
  label,
  placeholder,
}: {
  className: string;
  label: string;
  placeholder: string;
}) {
  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Input placeholder={placeholder} />
    </div>
  );
}

export default InputSection;
