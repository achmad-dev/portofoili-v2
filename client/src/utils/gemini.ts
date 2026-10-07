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

  const signature = await generateHmacSignature(timestamp, '', hmacSecret);
  const url = `${apiUrl}/ai/messages?page=${page}&limit=${limit}`;
  const response = await fetch(url, {
    headers: { 'x-timestamp': timestamp, 'x-signature': signature },
  });
  if (!response.ok) throw new Error('Failed to fetch messages');
  return response.json();
};

export const subscribeToGlobalStream = (
  onEvent: (event: AiEvent) => void
): { close: () => void } => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const hmacSecret = import.meta.env.VITE_HMAC_SECRET || 'default_secret';
  let eventSource: EventSource | undefined;
  let ticketRequest: AbortController | undefined;
  let retryTimer: number | undefined;
  let retries = 0;
  let closed = false;
  const connect = async () => {
    if (closed) return;
    try {
      const timestamp = Date.now().toString();
      const signature = await generateHmacSignature(timestamp, '', hmacSecret);
      if (closed) return;
      ticketRequest = new AbortController();
      const ticketResponse = await fetch(`${apiUrl}/auth/ticket`, {
        method: 'POST',
        headers: { 'x-timestamp': timestamp, 'x-signature': signature },
        signal: ticketRequest.signal,
      });
      ticketRequest = undefined;
      if (!ticketResponse.ok)
        throw new Error(`Ticket request failed (${ticketResponse.status})`);
      const { ticket } = await ticketResponse.json();
      if (closed) return;
      eventSource = new EventSource(
        `${apiUrl}/ai/messages/stream?ticket=${encodeURIComponent(ticket)}`
      );
      eventSource.onmessage = (event) => {
        try {
          onEvent(JSON.parse(event.data) as AiEvent);
        } catch {
          console.warn('Ignoring malformed chat update');
        }
      };
      eventSource.onopen = () => {
        retries = 0;
      };
      eventSource.onerror = () => {
        eventSource?.close();
        if (!closed)
          retryTimer = window.setTimeout(
            connect,
            Math.min(1000 * 2 ** retries++, 15000)
          );
      };
    } catch (error) {
      ticketRequest = undefined;
      if (closed) return;
      console.warn('Chat updates unavailable; retrying.', error);
      if (!closed)
        retryTimer = window.setTimeout(
          connect,
          Math.min(1000 * 2 ** retries++, 15000)
        );
    }
  };
  void connect();
  return {
    close: () => {
      closed = true;
      ticketRequest?.abort();
      window.clearTimeout(retryTimer);
      eventSource?.close();
    },
  };
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
    const bodyStr = JSON.stringify({ prompt });
    const send = async () => {
      const timestamp = Date.now().toString();
      const signature = await generateHmacSignature(
        timestamp,
        bodyStr,
        hmacSecret
      );
      return fetch(`${apiUrl}/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-timestamp': timestamp,
          'x-signature': signature,
        },
        body: bodyStr,
      });
    };
    let response = await send();
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After')) || 1;
      await new Promise((resolve) =>
        window.setTimeout(resolve, Math.min(retryAfter, 5) * 1000)
      );
      response = await send();
    }

    if (!response.ok) {
      if (response.status === 429) {
        onEvent({
          type: 'Error',
          content:
            'This network is sending requests too quickly. Please wait a moment before retrying.',
        });
        return;
      }
      onEvent({
        type: 'Error',
        content:
          response.status === 503
            ? 'The AI service is temporarily busy. Please retry in a moment.'
            : `The chat service returned an error (${response.status}). Please try again later.`,
      });
      return;
    }

    if (!response.body) {
      onEvent({ type: 'Error', content: 'No readable stream available.' });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let pending = '';
    let completed = false;
    const dispatch = (frame: string) => {
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!data) return;
      try {
        const event = JSON.parse(data) as AiEvent;
        onEvent(event);
        if (event.type === 'Response' || event.type === 'Error')
          completed = true;
      } catch {
        onEvent({
          type: 'Error',
          content:
            'The chat service returned an unreadable response. Please try again.',
        });
        completed = true;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const frames = pending.split(/\r?\n\r?\n/);
      pending = frames.pop() ?? '';
      frames.forEach(dispatch);
      if (done) {
        if (pending.trim()) dispatch(pending);
        break;
      }
    }
    if (!completed)
      onEvent({
        type: 'Error',
        content:
          'The connection ended before the assistant replied. Please retry.',
      });
  } catch (error) {
    console.error('Backend AI Error:', error);
    onEvent({
      type: 'Error',
      content: 'Could not connect to the backend AI Gateway.',
    });
  }
};
