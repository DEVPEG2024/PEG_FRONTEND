import { Customer } from './customer';
import { User } from './user';

export type Team = {
  documentId: string;
  members: User[];
  name: string;
  customer: Customer;
};