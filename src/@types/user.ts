import { Customer } from "./customer";
import { Producer } from "./producer";
import { PegFile } from "./pegFile";

export type Role = {
  documentId: string;
  name: string;
  description?: string;
};

export type User = {
  id: number;
  documentId: string;
  /** Identifiant legacy Mongo/Strapi v3 — encore utilisé en fallback (documentId || id || _id) */
  _id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  companyName?: string;
  customer?: Customer;
  producer?: Producer;
  role: Role;
  authority: string[];
  blocked: boolean;
  avatar?: PegFile;
}