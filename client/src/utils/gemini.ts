const generateHmacSignature = async (
  timestamp: string,
  body: string,
  secret: string
) => {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const dataToSign = enc.encode(`${timestamp}.${body}`);
  const signatureBuffer = await window.crypto.subtle.sign(
    'HMAC',
    key,
    dataToSign
  );

  // Convert ArrayBuffer to Hex String
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export type AiEvent =
  | { type: 'Thinking'; content: string }
  | { type: 'Response'; content: string }
  | { type: 'Error'; content: string };

export const fetchMessages = async (page: number, limit: number = 20) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const hmacSecret = import.meta.env.VITE_HMAC_SECRET || 'default_secret';
  const timestamp = Date.now().toString();

  // Canonical query (sorted alphabetically, no HMAC fields)
  // Must match the BTreeMap ordering on the backend
  const canonical = `limit=${limit}&page=${page}`;
  const signature = await generateHmacSignature(timestamp, canonical, hmacSecret);

  const url = `${apiUrl}/ai/messages?limit=${limit}&page=${page}&x_timestamp=${timestamp}&x_signature=${signature}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch messages');
  return response.json();
};

export const subscribeToGlobalStream = async (
  onEvent: (event: AiEvent) => void
): Promise<EventSource> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const hmacSecret = import.meta.env.VITE_HMAC_SECRET || 'default_secret';
  const timestamp = Date.now().toString();

  // No real params on this endpoint, so canonical is empty string
  const signature = await generateHmacSignature(timestamp, '', hmacSecret);

  const url = `${apiUrl}/ai/messages/stream?x_timestamp=${timestamp}&x_signature=${signature}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (e) => {
    try {
      const event: AiEvent = JSON.parse(e.data);
      onEvent(event);
    } catch (err) {
      console.error('Failed to parse global SSE event:', err);
    }
  };

  return eventSource;
};

export const callGemini = async (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    let fullResponse = '';

    streamGemini(prompt, (event) => {
      if (event.type === 'Response') {
        fullResponse += event.content;
      } else if (event.type === 'Error') {
        resolve(event.content);
      }
    })
      .then(() => {
        resolve(fullResponse || 'No response generated.');
      })
      .catch(() => {
        resolve('Could not connect to the backend AI Copilot.');
      });
  });
};

export const streamGemini = async (
  prompt: string,
  onEvent: (event: AiEvent) => void
): Promise<void> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const hmacSecret = import.meta.env.VITE_HMAC_SECRET || 'default_secret';

  try {
    const timestamp = Date.now().toString();
    const bodyStr = JSON.stringify({ prompt });
    const signature = await generateHmacSignature(
      timestamp,
      bodyStr,
      hmacSecret
    );

    const response = await fetch(`${apiUrl}/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-timestamp': timestamp,
        'x-signature': signature,
      },
      body: bodyStr,
    });

    if (!response.ok) {
      if (response.status === 429) {
        onEvent({
          type: 'Error',
          content: 'Rate limit exceeded. Try again tomorrow.',
        });
        return;
      }
      onEvent({ type: 'Error', content: `API Error: ${response.status}` });
      return;
    }

    if (!response.body) {
      onEvent({ type: 'Error', content: 'No readable stream available.' });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event: AiEvent = JSON.parse(jsonStr);
            onEvent(event);
          } catch (e) {
            console.error('Failed to parse SSE JSON:', jsonStr, e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Backend AI Error:', error);
    onEvent({
      type: 'Error',
      content: 'Could not connect to the backend AI Copilot.',
    });
  }
};
