import axios from 'axios';
import { EXPRESS_BACKEND_URL } from '@/configs/api.config';

const backend = () =>
  axios.create({
    baseURL: EXPRESS_BACKEND_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

export type FAQ = {
  _id: string;
  question: string;
  reponse: string;
};

export type ChatbotConfig = {
  _id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  systemPrompt: string;
  faqs: FAQ[];
  updatedAt: string;
};

export type ConversationSummary = {
  _id: string;
  userId?: string;
  userName: string;
  messageCount: number;
  createdAt: string;
  lastMessage?: { role: string; content: string; timestamp: string };
};

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatbotDocument = {
  id: number;
  name: string;
  file_url: string | null;
  file_type: 'image' | 'pdf' | 'text' | 'document';
  content: string | null;
  created_at: string;
};

// Config
export const apiGetChatbotConfig = () =>
  backend().get<{ result: boolean; config: ChatbotConfig }>('/chatbot/config');

export const apiUpdateChatbotConfig = (systemPrompt: string, name?: string, description?: string, avatarUrl?: string | null) =>
  backend().put<{ result: boolean; config: ChatbotConfig }>('/chatbot/config', { systemPrompt, name, description, avatarUrl });

// FAQs
export const apiAddFaq = (question: string, reponse: string) =>
  backend().post<{ result: boolean; config: ChatbotConfig }>('/chatbot/config/faq', { question, reponse });

export const apiUpdateFaq = (faqId: string, question: string, reponse: string) =>
  backend().put<{ result: boolean; config: ChatbotConfig }>(`/chatbot/config/faq/${faqId}`, { question, reponse });

export const apiDeleteFaq = (faqId: string) =>
  backend().delete<{ result: boolean; config: ChatbotConfig }>(`/chatbot/config/faq/${faqId}`);

// History
export const apiGetChatHistory = (params?: { page?: number; pageSize?: number; userId?: string; dateFrom?: string; dateTo?: string }) =>
  backend().get<{ result: boolean; conversations: ConversationSummary[]; total: number }>('/chatbot/history', { params });

export const apiGetConversation = (conversationId: string) =>
  backend().get<{ result: boolean; conversation: any }>(`/chatbot/history/${conversationId}`);

export const apiDeleteConversation = (conversationId: string) =>
  backend().delete<{ result: boolean }>(`/chatbot/history/${conversationId}`);

// Documents
export const apiGetDocuments = () =>
  backend().get<{ result: boolean; documents: ChatbotDocument[] }>('/chatbot/config/documents');

export const apiUploadDocument = (form: FormData) =>
  axios.post<{ result: boolean; document: ChatbotDocument }>(`${EXPRESS_BACKEND_URL}/chatbot/config/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

export const apiDeleteDocument = (docId: number) =>
  backend().delete<{ result: boolean }>(`/chatbot/config/documents/${docId}`);

// AI product fill
export const apiAiFillProduct = (
  name: string,
  availableSizes: string[] = [],
  availableColors: string[] = [],
  availableCategories: string[] = [],
  availableForms: string[] = [],
  availableChecklists: string[] = [],
) =>
  backend().post<{
    result: boolean;
    description: string;
    priceTiers: { minQuantity: number; price: number }[];
    suggestedSizes: string[];
    suggestedColors: string[];
    suggestedCategory: string;
    suggestedForm: string;
    suggestedChecklist: string;
  }>('/chatbot/ai-fill-product', { name, availableSizes, availableColors, availableCategories, availableForms, availableChecklists });

// AI image generation (simple)
export const apiGenerateProductImage = (name: string) =>
  backend().post<{ result: boolean; imageUrl: string }>('/chatbot/generate-image', { name });

// AI image generation (advanced — with style & reference images)
export const apiGenerateImageAdvanced = (prompt: string, style: string, referenceUrls?: string[]) =>
  backend().post<{ result: boolean; imageUrl: string }>('/chatbot/generate-image', { name: prompt, style, referenceUrls });

// AI content generation (description, highlights, selling points)
export const apiGenerateProductContent = (productName: string) =>
  backend().post<{
    result: boolean;
    description: string;
    highlights: string[];
    sellingPoints: string[];
  }>('/chatbot/generate-content', { productName });

// Live test
export const apiTestChat = (messages: Message[]) =>
  backend().post<{ result: boolean; reply: string }>('/chatbot/test', { messages });
