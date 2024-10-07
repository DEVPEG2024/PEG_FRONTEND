export type IFormAnswer = {
  _id: string;
  formId: string;
  answers: IFieldAnswer[]
}

export type IFieldAnswer = {
  fieldId: string;
  value: string | string[] | File[];
}
