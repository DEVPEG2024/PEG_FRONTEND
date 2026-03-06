export type ChecklistItem = {
  label: string;
  done: boolean;
};

export type Checklist = {
  documentId: string;
  name: string;
  items: string[];
};
