import { Image } from './product';
import { IUser, User } from './user';

export type Ticket = {
  documentId: string;
  user: User;
  name: string;
  description: string;
  image: Image;
  state: string;
  priority: string;
  type: string;
  createdAt: string;
};