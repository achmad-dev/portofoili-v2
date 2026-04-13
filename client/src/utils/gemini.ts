const generateHmacSignature = async (timestamp: string, body: string, secret: string) => {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const dataToSign = enc.encode(`${timestamp}.${body}`);
  const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, dataToSign);

  // Convert ArrayBuffer to Hex String
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const callGemini = async (prompt: string): Promise<string> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const hmacSecret = import.meta.env.VITE_HMAC_SECRET || 'default_secret';

  try {
    const timestamp = Date.now().toString();
    const bodyStr = JSON.stringify({ prompt });
    const signature = await generateHmacSignature(timestamp, bodyStr, hmacSecret);

    const response = await fetch(`${apiUrl}/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-timestamp': timestamp,
        'x-signature': signature
      },
      body: bodyStr,
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
