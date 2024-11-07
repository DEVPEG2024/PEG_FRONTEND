import { Input } from '@/components/ui';
import { ChangeEventHandler } from 'react';

function TextAreaSection({
  className,
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
}: {
  className: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: Function;
  disabled?: boolean;
}) {
  const onChangeTextArea: ChangeEventHandler<HTMLInputElement> = (e) => {
    onChange(e.currentTarget.value);
  };

  return (
    <div className={className}>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <Input
        textArea
        placeholder={placeholder}
        onChange={onChangeTextArea}
        {...(value && { value })}
        disabled={disabled}
      />
    </div>
  );
}

export default TextAreaSection;
