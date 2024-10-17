export type IFormAnswer = {
  form: string;
  answers: IFieldAnswer[]
}

export type IFieldAnswer = {
  fieldId: string;
  value: string | string[];
}

export type FileItem = {
  fileName: string;
  file: File;
}
