import { IconType } from 'react-icons';

export type IForm = {
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
}


export type IFormList = {
  _id: string;
  title: string;
  fields: IForm[];
  createdAt: Date;
  updatedAt: Date;
}
