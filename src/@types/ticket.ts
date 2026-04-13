import { PegFile } from './pegFile';
import { User } from './user';

export type TicketMessage = {
  id: string;
  content: string;
  images?: string[];
  createdBy: string;
  createdByRole: string;
  createdAt: string;
};

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
  messages?: TicketMessage[];
};
