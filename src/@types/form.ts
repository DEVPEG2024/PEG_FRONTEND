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
  name: string;
  type: string;
  required: boolean;
  options: Record<string, any>;
};