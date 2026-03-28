import axios from 'axios';
import ApiService from './ApiService';
import { API_BASE_URL } from '@/configs/api.config';

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
  images?: string[];
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
  ApiService.fetchData<{ result: boolean; config: ChatbotConfig }>({ url: '/chatbot/config', method: 'get' });

export const apiUpdateChatbotConfig = (systemPrompt: string, name?: string, description?: string, avatarUrl?: string | null) =>
  ApiService.fetchData<{ result: boolean; config: ChatbotConfig }>({ url: '/chatbot/config', method: 'put', data: { systemPrompt, name, description, avatarUrl } });

// FAQs
export const apiAddFaq = (question: string, reponse: string) =>
  ApiService.fetchData<{ result: boolean; config: ChatbotConfig }>({ url: '/chatbot/config/faq', method: 'post', data: { question, reponse } });

export const apiUpdateFaq = (faqId: string, question: string, reponse: string) =>
  ApiService.fetchData<{ result: boolean; config: ChatbotConfig }>({ url: `/chatbot/config/faq/${faqId}`, method: 'put', data: { question, reponse } });

export const apiDeleteFaq = (faqId: string) =>
  ApiService.fetchData<{ result: boolean; config: ChatbotConfig }>({ url: `/chatbot/config/faq/${faqId}`, method: 'delete' });

// History
export const apiGetChatHistory = (params?: { page?: number; pageSize?: number; userId?: string; dateFrom?: string; dateTo?: string }) =>
  ApiService.fetchData<{ result: boolean; conversations: ConversationSummary[]; total: number }>({ url: '/chatbot/history', method: 'get', params });

export const apiGetConversation = (conversationId: string) =>
  ApiService.fetchData<{ result: boolean; conversation: any }>({ url: `/chatbot/history/${conversationId}`, method: 'get' });

export const apiDeleteConversation = (conversationId: string) =>
  ApiService.fetchData<{ result: boolean }>({ url: `/chatbot/history/${conversationId}`, method: 'delete' });

// Documents
export const apiGetDocuments = () =>
  ApiService.fetchData<{ result: boolean; documents: ChatbotDocument[] }>({ url: '/chatbot/config/documents', method: 'get' });

export const apiUploadDocument = (form: FormData) =>
  ApiService.fetchData<{ result: boolean; document: ChatbotDocument }>({ url: '/chatbot/config/documents', method: 'post', data: form, headers: { 'Content-Type': undefined } });

export const apiDeleteDocument = (docId: number) =>
  ApiService.fetchData<{ result: boolean }>({ url: `/chatbot/config/documents/${docId}`, method: 'delete' });

// AI rewrite description
export const apiRewriteDescription = (text: string, context?: string) =>
  ApiService.fetchData<{ result: boolean; description: string }>({ url: '/chatbot/rewrite-description', method: 'post', data: { text, context } });

// AI product fill
export const apiAiFillProduct = (
  name: string,
  availableSizes: string[] = [],
  availableColors: string[] = [],
  availableCategories: string[] = [],
  availableForms: string[] = [],
  availableChecklists: string[] = [],
) =>
  ApiService.fetchData<{
    result: boolean;
    description: string;
    priceTiers: { minQuantity: number; price: number }[];
    suggestedSizes: string[];
    suggestedColors: string[];
    suggestedCategory: string;
    suggestedForm: string;
    suggestedChecklist: string;
  }>({ url: '/chatbot/ai-fill-product', method: 'post', data: { name, availableSizes, availableColors, availableCategories, availableForms, availableChecklists } });

// AI product suggestions (trends & events)
export type ProductSuggestion = {
  name: string;
  reason: string;
  priceRange: string;
  tag: 'saison' | 'événement' | 'tendance' | 'best-seller';
  emoji: string;
};

export const apiGetProductSuggestions = (availableCategories: string[] = []) =>
  ApiService.fetchData<{ result: boolean; suggestions: ProductSuggestion[] }>({
    url: '/chatbot/product-suggestions',
    method: 'post',
    data: { availableCategories },
  });

// AI image generation (simple, with optional logo for branding placement)
export const apiGenerateProductImage = (name: string, logoUrl?: string) =>
  ApiService.fetchData<{ result: boolean; imageUrl: string }>({ url: '/chatbot/generate-image', method: 'post', data: { name, ...(logoUrl ? { logoUrl } : {}) } });

// AI image generation (advanced — with style & reference images)
export const apiGenerateImageAdvanced = (prompt: string, style: string, referenceUrls?: string[]) =>
  ApiService.fetchData<{ result: boolean; imageUrl: string }>({ url: '/chatbot/generate-image', method: 'post', data: { name: prompt, style, referenceUrls } });

// AI content generation (description, highlights, selling points)
export const apiGenerateProductContent = (productName: string) =>
  ApiService.fetchData<{
    result: boolean;
    description: string;
    highlights: string[];
    sellingPoints: string[];
  }>({ url: '/chatbot/generate-content', method: 'post', data: { productName } });

// Live test
export const apiTestChat = (messages: Message[]) =>
  ApiService.fetchData<{ result: boolean; reply: string }>({ url: '/chatbot/test', method: 'post', data: { messages } });
