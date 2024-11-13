import { IUser } from './user';

export interface ITicket {
  _id: string;
  ref: string;
  user: IUser;
  team: IUser;
  type: string;
  title: string;
  description: string;
  file: string;
  status: string;
  priority: string;
  createdAt: Date;
}
