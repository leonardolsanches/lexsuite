import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';

export function useStreaming() {
  const [isStreaming, setIsStreaming] = useState(false);
  const { getToken } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort('cancelled');
  }, []);

  const startStream = useCallback(async (
    requestData: any,
    onComplete?: (fullContent: string) => void,
    onChunk?: (partialContent: string) => void
  ) => {
    // Cancel any existing stream first
    abortControllerRef.current?.abort('replaced');
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    let fullContent = '';

    try {
      const token = await getToken();

      const response = await fetch('/api/analyze', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        let msg = 'Falha ao iniciar análise';
        try { msg = JSON.parse(errText).error || msg; } catch {}
        throw new Error(msg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('Sem stream de resposta');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'text' && parsed.text) {
              fullContent += parsed.text;
              onChunk?.(fullContent);
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message || 'Erro durante análise');
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }

      // Only call onComplete if not aborted
      if (!controller.signal.aborted) {
        onComplete?.(fullContent);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' || controller.signal.aborted) {
        // Silently swallow — cancelled intentionally
        return;
      }
      throw e;
    } finally {
      setIsStreaming(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [getToken]);

  return { isStreaming, startStream, cancelStream };
}
