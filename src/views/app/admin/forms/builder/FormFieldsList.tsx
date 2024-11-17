import { Button, Input } from '@/components/ui';
import { FormFieldType } from '../constants/type';
import { FormField } from '@/@types/form';

function FormFieldsList({
  formFieldTypes,
  handleFormFieldTypeSelected,
}: {
  formFieldTypes: FormFieldType[];
  handleFormFieldTypeSelected: (formFieldType: FormFieldType) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-2">
        {formFieldTypes.map((formFieldType: FormFieldType) => (
          <div
            key={formFieldType.id}
            className="flex justify-between items-center gap-4 py-1 px-4 bg-gray-800 rounded-md"
          >
            <div className="flex items-center gap-2">
              <formFieldType.icon className="text-white text-lg h-6 w-6" />
              <p className="text-white text-md">{formFieldType.label}</p>
            </div>
            <Button
              variant="twoTone"
              size="md"
              color="green"
              onClick={() => handleFormFieldTypeSelected(formFieldType)}
            >
              <p className="text-white text-xl">+</p>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FormFieldsList;
