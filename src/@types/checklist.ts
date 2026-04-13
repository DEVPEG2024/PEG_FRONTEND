export type ChecklistItem = {
  label: string;
  done: boolean;
  visible?: boolean; // true par défaut — false = masqué pour clients/producteurs
};

export type Checklist = {
  documentId: string;
  name: string;
  items: string[];
};
