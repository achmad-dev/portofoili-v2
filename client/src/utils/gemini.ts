export const callGemini = async (prompt: string): Promise<string> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

  try {
    const response = await fetch(`${apiUrl}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return 'Rate limit exceeded. Try again tomorrow.';
      }
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.content || 'No response generated.';
  } catch (error) {
    console.error('Backend AI Error:', error);
    return 'Error: Could not connect to the backend AI Copilot.';
  }
};
