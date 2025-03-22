// OpenRouter API service

// Get API key from environment variables
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

/**
 * Call OpenRouter API with streaming support
 * @param {Object} options - Options for the API call
 * @param {string} options.prompt - The prompt to send to the API
 * @param {string} options.modelId - The model ID to use
 * @param {Function} options.onChunk - Callback for each chunk of the response
 * @param {Function} options.onComplete - Callback when streaming is complete
 * @param {Function} options.onError - Callback for errors
 */
export const callOpenRouter = async ({
  prompt,
  modelId,
  onChunk = () => {},
  onComplete = () => {},
  onError = () => {},
}) => {
  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API error: ${response.status} ${JSON.stringify(errorData)}`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              result += content;
              onChunk(result);
            }
          } catch (e) {
            console.error('Error parsing stream data:', e);
          }
        }
      }
    }

    onComplete(result);
    return result;
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    onError(error);
    return 'Error generating content. Please try again.';
  }
};

/**
 * Call OpenRouter API without streaming
 * @param {string} prompt - The prompt to send to the API
 * @param {string} modelId - The model ID to use
 * @returns {Promise<string>} - The generated content
 */
export const callOpenRouterSync = async (prompt, modelId) => {
  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API error: ${response.status} ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    return 'Error generating content. Please try again.';
  }
};

export default {
  callOpenRouter,
  callOpenRouterSync,
};
