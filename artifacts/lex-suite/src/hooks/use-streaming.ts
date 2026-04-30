import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

export type ExecStep = {
  id: string;
  label: string;
  icon: string;
  at: number;
};

/**
 * Inactivity timeout in milliseconds.
 *
 * If no SSE event (including heartbeats) arrives within this window the hook
 * aborts the stream and surfaces a clear timeout error.  The Cloudflare tunnel
 * that sits in front of Ollama closes idle connections after ~100 s, so we
 * use 120 s as a conservative limit — long enough not to false-positive
 * during a legitimate thinking phase, short enough to catch a dead connection
 * quickly.
 */
const INACTIVITY_TIMEOUT_MS = 120_000; // 120 seconds

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
    onChunk?: (partialContent: string) => void,
    onStep?: (step: ExecStep) => void,
    onStatus?: (msg: string) => void,
  ) => {
    abortControllerRef.current?.abort('replaced');
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    let fullContent = '';

    // Inactivity watchdog — reset on every received event, fire on silence.
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort('timeout');
        }
      }, INACTIVITY_TIMEOUT_MS);
    };

    const clearInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
      }
    };

    try {
      const token = await getToken();

      const response = await fetch(`${apiBase}/api/analyze`, {
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

      // Start the watchdog now that the connection is open.
      resetInactivityTimer();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Any received bytes reset the inactivity watchdog — this includes
        // server heartbeat comments that don't carry visible data.
        resetInactivityTimer();

        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          // SSE comment lines (heartbeats) start with ":" — they keep the
          // connection alive through proxies but carry no data.  Reset the
          // timer is already done above; nothing else to do here.
          if (line.startsWith(':')) continue;

          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'step') {
              onStep?.({ id: parsed.id, label: parsed.label, icon: parsed.icon, at: Date.now() });
            } else if (parsed.type === 'status' && parsed.message) {
              onStatus?.(parsed.message);
            } else if (parsed.type === 'text' && parsed.text) {
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

      clearInactivityTimer();

      if (!controller.signal.aborted) {
        onComplete?.(fullContent);
      }
    } catch (e: any) {
      clearInactivityTimer();

      if (e?.name === 'AbortError' || controller.signal.aborted) {
        const reason = (e as any)?.message ?? '';
        if (reason === 'timeout' || (controller.signal as any).reason === 'timeout') {
          throw new Error(
            'A análise não recebeu resposta por 2 minutos. ' +
            'O modelo pode estar sobrecarregado ou a conexão foi interrompida. ' +
            'Tente novamente ou use o Modo Rápido (⚡) para uma resposta mais veloz.'
          );
        }
        // Cancelled by user — silent return
        return;
      }
      throw e;
    } finally {
      clearInactivityTimer();
      setIsStreaming(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [getToken]);

  return { isStreaming, startStream, cancelStream };
}
