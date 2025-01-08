import { Input } from '@/components/ui';

function FieldCustom({
  value,
  setValue,
  placeholder,
  type = 'text',
}: {
  value: string | number;
  setValue: (value: string | number) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-200 mb-2">{placeholder}</p>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        required={true}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

export default FieldCustom;
