import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/react';

export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const { getToken } = useAuth();

  const startStream = useCallback(async (requestData: any, onComplete?: (fullContent: string) => void) => {
    setIsStreaming(true);
    setStreamContent('');
    let fullContent = '';

    const token = await getToken();
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      setIsStreaming(false);
      const errText = await response.text().catch(() => '');
      let msg = 'Falha ao iniciar análise';
      try { msg = JSON.parse(errText).error || msg; } catch {}
      throw new Error(msg);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      setIsStreaming(false);
      throw new Error('Sem stream de resposta');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'text' && parsed.text) {
              fullContent += parsed.text;
              setStreamContent(prev => prev + parsed.text);
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message || 'Erro durante análise');
            }
            // type === 'done' — ignore, loop will end naturally
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }

      if (onComplete) {
        onComplete(fullContent);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [getToken]);

  return { isStreaming, streamContent, startStream, setStreamContent };
}
