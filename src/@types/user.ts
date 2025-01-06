import { Customer } from "./customer";
import { Producer } from "./producer";
import { Image } from "./image";

export type Role = {
  documentId: string;
  name: string;
};

export type User = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  customer?: Customer;
  producer?: Producer;
  role: Role;
  authority: string[];
  blocked: boolean;
  avatar: Image;
}