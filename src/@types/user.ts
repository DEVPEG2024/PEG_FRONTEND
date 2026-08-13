import { Customer } from "./customer";
import { Producer } from "./producer";
import { PegFile } from "./pegFile";

export type Role = {
  documentId: string;
  name: string;
  description?: string;
  type?: string;
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
  /** Profil Générateur (apporteur d'affaires) rattaché au compte, le cas échéant. */
  generator?: { documentId: string; name?: string; referralCode?: string };
  role: Role;
  authority: string[];
  blocked: boolean;
  avatar?: PegFile;
}