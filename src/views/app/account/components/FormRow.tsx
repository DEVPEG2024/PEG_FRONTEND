import classNames from 'classnames';
import { FormItem } from '@/components/ui/Form';
import type { PropsWithChildren } from 'react';
import type { FieldErrors, FieldValues } from 'react-hook-form';

type FormRowProps<T extends FieldValues> = PropsWithChildren<{
  label: string;
  errors: FieldErrors<T>;
  touched: Partial<Record<keyof T, boolean>>;
  name: keyof T;
  border?: boolean;
  alignCenter?: boolean;
}>;

const FormRow = <T extends FieldValues>(props: FormRowProps<T>) => {
  const {
    label,
    children,
    errors,
    touched,
    name,
    border = true,
    alignCenter = true,
  } = props;

  const fieldError = errors[name as string];
  const hasError = fieldError && touched[name];
  const errorMessage =
    hasError && fieldError.message ? String(fieldError.message) : '';

  return (
    <div
      className={classNames(
        'grid md:grid-cols-3 gap-4 py-8',
        border && 'border-b border-gray-200 dark:border-gray-600',
        alignCenter && 'items-center'
      )}
    >
      <div className="font-semibold">{label}</div>
      <div className="col-span-2">
        <FormItem
          className="mb-0 max-w-[700px]"
          invalid={!!hasError}
          errorMessage={errorMessage}
        >
          {children}
        </FormItem>
      </div>
    </div>
  );
};

export default FormRow;
