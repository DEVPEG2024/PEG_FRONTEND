export type IFormAnswer = {
  formId: string;
  answers: IFieldAnswer[]
}

export type IFieldAnswer = {
  fieldId: string;
  value: string | string[] | FileItem[];
}

export type FileItem = {
  fileName: string;
  file: File;
}
