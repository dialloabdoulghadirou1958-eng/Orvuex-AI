import { ReactNode } from 'react';

export type ProviderId = 'openai' | 'deepseek' | 'groq' | 'mistral' | 'openrouter' | 'gemini' | 'cerebras';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  description: string;
  domain: string;
  defaultModel: string;
}

export type ApiKeys = Partial<Record<ProviderId, string>>;

export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
