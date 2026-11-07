export type WhatsappState = 'agent' | 'waiting_human' | 'human';

export type WhatsappConversation = {
  id: number;
  phone: string;
  name: string;
  state: WhatsappState;
  isTest: boolean;
  consent: boolean | null;
  unread: number;
  preview: string;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  updatedAt: string | null;
  windowOpen: boolean;
  windowClosesAt: string | null;
  handoffReason: string | null;
  handoffSummary: string | null;
  handoffAt: string | null;
  offerTotalTTC: number | null;
  leadDocumentId: string | null;
  customerDocumentId: string | null;
  pendingReply: string | null;
};

export type WhatsappMessage = {
  id: number;
  direction: 'in' | 'out';
  author: 'contact' | 'agent' | 'admin' | 'system';
  kind: string;
  body: string | null;
  mediaUrl: string | null;
  mediaName: string | null;
  status: string;
  error: string | null;
  createdAt: string;
  buttons: { id: string; title: string }[] | null;
  rows: { id: string; title: string; description?: string }[] | null;
  button: string | null;
  label: string | null;
  url: string | null;
};

export type WhatsappStatus = {
  live: boolean;
  webhookReady: boolean;
  displayPhone: string | null;
  templateReady: boolean;
  frontendUrl: string;
};

export type WhatsappPayView = {
  status: 'pending' | 'paid' | 'expired' | 'canceled';
  test: boolean;
  expiresAt: string | null;
  lines: {
    name: string;
    quantity: number;
    totalHT: number | null;
    detail: string | null;
  }[];
  shippingHT: number;
  totalHT: number;
  totalTTC: number;
  billing: {
    name: string;
    company: string | null;
    email: string | null;
    address: string | null;
    zipCode: string | null;
    city: string | null;
  };
  whatsappNumber: string | null;
};
