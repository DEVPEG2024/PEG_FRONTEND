export type Form = {
  documentId: string;
  name: string;
  fields: JSONValue;
};

export type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;