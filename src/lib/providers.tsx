import { ProviderConfig } from '../types';

// WARNING: This application operates in a pure Client-Side BYOK (Bring Your Own Key) mode.
// User-provided API keys are stored locally in the browser's localStorage and used directly
// from the client side to make requests to the respective AI providers.
// This architecture avoids backend storage but means keys are handled entirely in the browser.

export const AI_PROVIDERS: ProviderConfig[] = [
  { 
    id: 'openai', 
    name: 'OpenAI', 
    baseUrl: 'https://api.openai.com/v1', 
    description: 'Modèles GPT-4o, GPT-3.5-turbo',
    domain: 'openai.com',
    defaultModel: 'gpt-4o'
  },
  { 
    id: 'deepseek', 
    name: 'DeepSeek', 
    baseUrl: 'https://api.deepseek.com/v1', 
    description: 'DeepSeek Coder & Chat',
    domain: 'deepseek.com',
    defaultModel: 'deepseek-chat'
  },
  { 
    id: 'groq', 
    name: 'Groq', 
    baseUrl: 'https://api.groq.com/openai/v1', 
    description: 'Inférence ultra-rapide (Llama 3.3, Llama 3.1)',
    domain: 'groq.com',
    defaultModel: 'llama-3.3-70b-versatile'
  },
  { 
    id: 'mistral', 
    name: 'Mistral AI', 
    baseUrl: 'https://api.mistral.ai/v1', 
    description: 'Mistral Large, NeMo',
    domain: 'mistral.ai',
    defaultModel: 'mistral-large-latest'
  },
  { 
    id: 'openrouter', 
    name: 'OpenRouter', 
    baseUrl: 'https://openrouter.ai/api/v1', 
    description: 'Accès unifié à multiples modèles',
    domain: 'openrouter.ai',
    defaultModel: 'google/gemini-2.5-pro'
  },
  { 
    id: 'gemini', 
    name: 'Google Gemini', 
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta', 
    description: 'Gemini 2.0 & 1.5 (Pro & Flash)',
    domain: 'gemini.google.com',
    defaultModel: 'gemini-2.0-flash'
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    description: 'Inférence instantanée CS-3 (Llama 3.3)',
    domain: 'cerebras.ai',
    defaultModel: 'llama3.3-70b'
  }
];

