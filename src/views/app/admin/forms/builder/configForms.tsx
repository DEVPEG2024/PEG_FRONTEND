import React from 'react';
import { Button } from '@/components/ui';
import { FormFieldType } from '../constants/type';
import InputSection from './components/fields/input';
import TextAreaSection from './components/fields/textArea';
import SelectSection from './components/fields/select';
import DateSection from './components/fields/date';
import RadioSection from './components/fields/radio';
import CheckBoxSection from './components/fields/checkBox';
import InputNumberSection from './components/fields/inputNumber';
import UploadSection from './components/fields/uplaodSection';
import ColorSection from './components/fields/color';

interface ConfigFormsProps {
  selectedFields: FormFieldType[];
  handleDeleteForm: (form: FormFieldType) => void;
  moveField: (index: number, direction: 'up' | 'down') => void;
}

function ConfigForms({
  selectedFields,
  handleDeleteForm,
  moveField,
}: ConfigFormsProps) {
  return (
    <div className="flex flex-col gap-4">
      {selectedFields.map((form: FormFieldType, index: number) => {
        return (
          <div
            key={form.id.toString()}
            className="flex items-center gap-4 bg-gray-800 p-4 rounded-md"
          >
            {renderFormField(form)}
            <div className="flex gap-2 mt-4">
              <Button
                variant="twoTone"
                size="xs"
                color="green"
                onClick={() => moveField(index, 'up')}
                disabled={index === 0}
              >
                ↑
              </Button>
              <Button
                variant="twoTone"
                size="xs"
                color="green"
                onClick={() => moveField(index, 'down')}
                disabled={index === selectedFields.length - 1}
              >
                ↓
              </Button>
              <Button
                variant="twoTone"
                size="xs"
                onClick={() => handleDeleteForm(form)}
              >
                X
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderFormField(form: FormFieldType) {
  const options = form.options
    ? form.options.map((option: any) => ({ label: option, value: option }))
    : [];
  switch (form.type) {
    case 'input':
      return (
        <InputSection
          className="w-full"
          label={form.label}
          placeholder={form.placeholder}
        />
      );
    case 'textarea':
      return (
        <TextAreaSection
          className="w-full"
          label={form.label}
          placeholder={form.placeholder}
        />
      );
    case 'select':
      return (
        <SelectSection
          className="w-full"
          label={form.label}
          placeholder={form.placeholder}
          options={options}
        />
      );
    case 'date':
      return (
        <DateSection
          className="w-full"
          label={form.label}
          placeholder={form.placeholder}
        />
      );
    case 'radio':
      return (
        <RadioSection
          className="w-full"
          label={form.label}
          placeholder={form.placeholder}
          options={options}
        />
      );
    case 'checkbox':
      return (
        <CheckBoxSection
          className="w-full"
          label={form.label}
          placeholder={form.placeholder}
          options={options}
        />
      );
    case 'file':
      return (
        <UploadSection
          className="w-full"
          label={form.label}
          acceptedFileTypes={form.acceptedFileTypes || ''}
        />
      );
    case 'color':
      return (
        <ColorSection
          className="w-full"
          label={form.label}
          placeholder={form.placeholder}
        />
      );
    case 'inputNumber':
      return (
        <InputNumberSection
          className="w-full"
          label={form.label}
          placeholder={form.placeholder}
          min={form.min || 0}
          max={form.max || 100}
        />
      );
    default:
      return null;
  }
}

export default ConfigForms;
