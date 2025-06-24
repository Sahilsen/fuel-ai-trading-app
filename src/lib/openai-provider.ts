import { createOpenAI } from '@ai-sdk/openai';

// Create a function that returns an OpenAI provider with the API key
export function getOpenAIProvider() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured in environment variables');
  }
  
  return createOpenAI({
    apiKey: apiKey,
  });
}

// Helper to check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}