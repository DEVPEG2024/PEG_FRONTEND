import { PegFile } from './pegFile';
import { User } from './user';

export type Ticket = {
  documentId: string;
  user: User;
  name: string;
  description: string;
  image: PegFile;
  state: string;
  priority: string;
  type: string;
  createdAt: string;
};