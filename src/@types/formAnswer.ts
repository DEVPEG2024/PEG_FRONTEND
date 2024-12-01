import { Form, JSONValue } from './form';

export type FormAnswer = {
  documentId: string;
  form: Form;
  answer: FormioSubmission;
};

type FormioSubmission = {
  data: JSONValue;
  metadata: JSONValue;
  state: string;
}
