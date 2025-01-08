import { Producer } from "./producer";
import { Project } from "./project";

export type Transaction = {
  documentId: string;
  description: string;
  amount: number;
  type: string;
  project: Project;
  date: Date;
  producer: Producer;
}