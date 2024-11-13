export interface IMail extends Document {
  name: string;
  label: string;
  group: string;
  flagged: boolean;
  starred: boolean;
  from: string;
  to: string;
  title: string;
  status: string;
  createdAt: Date;
  startDate: Date;
  messages: IMessage[];
}

export interface IMessage extends Document {
  user: string;
  content: string;
  date: Date;
  attachments: IAttachment[];
}

export interface IAttachment extends Document {
  file: string;
  size: string;
  type: string;
}
