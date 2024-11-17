import { Field } from 'formik';
import { IconType } from 'react-icons';

export type IField = {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  icon: IconType;
  options?: string[];
  inputType?: string;
  rows?: number;
  defaultDate?: Date | null;
  acceptedFileTypes?: string;
  min?: number;
  max?: number;
  defaultColor?: string;
};

export type IForm = {
  _id: string;
  title: string;
  fields: IField[];
  createdAt: Date;
  updatedAt: Date;
};

export type Form = {
  documentId: string;
  name: string;
  form_fields: FormField[];
};

export type FormField = {
  documentId: string;
  type: string;
};

export type FormField_value = FormField & {
  value: string
}

export function isFormFieldValue(formField: FormField): formField is FormField_value {
  return ['input', 'textarea'].includes(formField.type)
}

export type FormField_options = FormField & {
  options: {id: string, value: string}[]
}

export function isFormFieldOptions(formField: FormField): formField is FormField_options {
  return ['select', 'checkbox', 'radio'].includes(formField.type)
}