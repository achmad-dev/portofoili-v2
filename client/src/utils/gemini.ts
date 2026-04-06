export const callGemini = async (prompt: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  if (!apiKey) {
    // Mock response when no API key is provided
    return `[Mock AI Response]\nThis is a simulated response since no API key is configured.\nYou asked: "${prompt}"`;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('Gemini API Error');

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response generated.'
    );
  } catch (error) {
    console.error('Gemini Error:', error);
    return 'Error: Could not connect to AI Copilot.';
  }
};
