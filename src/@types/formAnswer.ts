import { FileNameBackFront } from "./file";

export type IFormAnswer = {
  form: string;
  answers: IFieldAnswer[]
}

export type IFieldAnswer = {
  fieldId: string;
  value: string | string[] | FileNameBackFront[];
}
