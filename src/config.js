/**
 * Configuration for the Management Inclination Benchmark application
 */

// Available LLMs
export const availableLLMs = [
  {
    id: 'gemini',
    name: 'Gemini',
    avatarBg: '#1C69FF',
    brandColor: '#1C69FF',
    avatarText: 'G',
    apiId: 'google/gemini-flash-1.5',
    avatarSrc:
      'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/gemini.svg',
  },
  {
    id: 'claude',
    name: 'Claude',
    avatarBg: '#D97757',
    brandColor: '#D97757',
    avatarText: 'C',
    apiId: 'anthropic/claude-3-haiku',
    avatarSrc:
      'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/claude.svg',
  },
  {
    id: 'llama',
    name: 'Llama',
    avatarBg: 'grey',
    brandColor: 'grey',
    avatarText: 'L',
    apiId: 'meta-llama/llama-3-70b-instruct',
    avatarSrc:
      'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/ollama.svg',
  },
  {
    id: 'gpt4',
    name: 'GPT-4',
    avatarBg: 'bg-green-600',
    brandColor: '#19A37F',
    avatarText: 'G4',
    apiId: 'openai/gpt-4o-mini',
    avatarSrc:
      'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    avatarBg: '#FA520F',
    brandColor: '#FA520F',
    avatarText: 'M',
    apiId: 'mistralai/mistral-nemo',
    avatarSrc:
      'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/mistral.svg',
  },
  {
    id: 'qwen',
    name: 'Qwen',
    avatarBg: '#615CED',
    brandColor: '#615CED',
    avatarText: 'Q',
    apiId: 'qwen/qwen-2.5-7b-instruct',
    avatarSrc:
      'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/qwen.svg',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    avatarBg: '#4D6BFE',
    brandColor: '#4D6BFE',
    avatarText: 'D',
    apiId: 'deepseek/deepseek-chat',
    avatarSrc:
      'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/deepseek.svg',
  },
];

// Predefined management tensions
export const predefinedTensions = [
  {
    conceptA: 'Explore',
    conceptB: 'Exploit',
    context:
      'Your company needs to decide how to allocate resources between exploring new opportunities versus exploiting existing ones.',
    optionA: 'Invest significantly in R&D to discover new market opportunities',
    optionB: 'Focus on optimizing and scaling current successful product lines',
  },
  {
    conceptA: 'Compete',
    conceptB: 'Collaborate',
    context: 'You need to decide how to approach a new market entry strategy.',
    optionA:
      'Aggressively compete against existing players to gain market share',
    optionB:
      'Seek strategic partnerships and collaborations with established players',
  },
  {
    conceptA: 'Centralize',
    conceptB: 'Decentralize',
    context: 'Your organization is restructuring decision-making processes.',
    optionA: 'Establish centralized authority for consistency and control',
    optionB: 'Distribute decision-making authority to empower local teams',
  },
  {
    conceptA: 'Standardize',
    conceptB: 'Customize',
    context: 'Your product team is defining the approach for a global product.',
    optionA: 'Create standardized offerings for efficiency and consistency',
    optionB: 'Develop customized solutions for different market segments',
  },
  {
    conceptA: 'Short-term',
    conceptB: 'Long-term',
    context: 'Your organization needs to set investment priorities.',
    optionA:
      'Focus on initiatives that deliver immediate returns this fiscal year',
    optionB:
      'Invest in long-term strategic capabilities that may take years to mature',
  },
];

export default {
  availableLLMs,
  predefinedTensions,
};
