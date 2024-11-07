import { Input } from '@/components/ui';

function TextAreaSection({
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
      <Input textArea placeholder={placeholder} />
    </div>
  );
}

export default TextAreaSection;
