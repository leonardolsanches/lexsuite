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
 * Backend-managed job queue hook.
 * Replaces use-streaming.ts — same external interface but jobs persist on the
 * server even when the browser is closed.
 */
export function useJobQueue() {
  const [isStreaming, setIsStreaming] = useState(false);
  const { getToken } = useAuth();
  const activeJobIdRef = useRef<string | null>(null);
  const abortEventSourceRef = useRef<(() => void) | null>(null);

  const cancelStream = useCallback(async () => {
    const jobId = activeJobIdRef.current;
    if (!jobId) return;

    // Close SSE first
    abortEventSourceRef.current?.();

    try {
      const token = await getToken();
      await fetch(`${apiBase}/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* silent */ }

    activeJobIdRef.current = null;
    setIsStreaming(false);
  }, [getToken]);

  const startStream = useCallback(async (
    requestData: Record<string, unknown>,
    onComplete?: (fullContent: string) => void,
    onChunk?: (partialContent: string) => void,
    onStep?: (step: ExecStep) => void,
    onStatus?: (msg: string) => void,
  ) => {
    // Cancel any in-progress job
    if (activeJobIdRef.current) {
      await cancelStream();
    }

    setIsStreaming(true);
    let fullContent = '';

    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // ── 1. Enqueue the job ──────────────────────────────────────────────────
      const enqueueRes = await fetch(`${apiBase}/api/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData),
      });

      if (!enqueueRes.ok) {
        const errText = await enqueueRes.text().catch(() => '');
        let msg = 'Falha ao iniciar análise';
        try { msg = JSON.parse(errText).error || msg; } catch {}
        throw new Error(msg);
      }

      const { jobId } = await enqueueRes.json() as { jobId: string };
      activeJobIdRef.current = jobId;

      // ── 2. Connect to SSE event stream ──────────────────────────────────────
      await new Promise<void>((resolve, reject) => {
        let closed = false;

        const close = () => {
          if (closed) return;
          closed = true;
          abortEventSourceRef.current = null;
          clearInterval(heartbeatWatchdog);
        };

        abortEventSourceRef.current = close;

        // Use fetch-based SSE for Authorization header support
        let abortCtrl: AbortController | null = new AbortController();

        // Heartbeat watchdog: if no event arrives for 3 min, assume job is alive
        // but connection dropped — resolve without error so caller can poll
        let lastEventAt = Date.now();
        const heartbeatWatchdog = setInterval(() => {
          if (Date.now() - lastEventAt > 180_000) {
            clearInterval(heartbeatWatchdog);
            close();
            // Don't reject — the job is still running on server; caller can recover via session
            resolve();
          }
        }, 10_000);

        (async () => {
          try {
            const sseRes = await fetch(`${apiBase}/api/jobs/${jobId}/events`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              signal: abortCtrl!.signal,
            });

            if (!sseRes.ok || !sseRes.body) {
              throw new Error('Falha ao conectar ao stream de eventos do job');
            }

            const reader = sseRes.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (closed) break;

              lastEventAt = Date.now();
              const chunk = decoder.decode(value);

              for (const line of chunk.split('\n')) {
                if (line.startsWith(':')) continue;
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (!raw) continue;

                try {
                  const parsed = JSON.parse(raw);

                  if (parsed.type === 'step') {
                    onStep?.({ id: parsed.id, label: parsed.label, icon: parsed.icon, at: Date.now() });
                  } else if (parsed.type === 'text' && parsed.text) {
                    fullContent += parsed.text;
                    onChunk?.(fullContent);
                  } else if (parsed.type === 'ping') {
                    // keep-alive, nothing to do
                  } else if (parsed.type === 'error') {
                    close();
                    abortCtrl?.abort();
                    abortCtrl = null;
                    reject(new Error(parsed.message || 'Erro durante análise'));
                    return;
                  } else if (parsed.type === 'done') {
                    close();
                    abortCtrl?.abort();
                    abortCtrl = null;
                    resolve();
                    return;
                  }
                } catch (e: unknown) {
                  if (e instanceof Error && !e.message.includes('JSON')) {
                    close();
                    reject(e);
                    return;
                  }
                }
              }
            }

            // Stream ended without explicit done/error — treat as done
            close();
            resolve();
          } catch (e: unknown) {
            if (e instanceof Error && e.name === 'AbortError') {
              // Intentional abort (cancel or reconnect)
              return;
            }
            close();
            reject(e);
          }
        })();

        // Wire up external cancel signal
        const originalClose = close;
        abortEventSourceRef.current = () => {
          originalClose();
          abortCtrl?.abort();
          abortCtrl = null;
        };
      });

      activeJobIdRef.current = null;
      onComplete?.(fullContent);
    } catch (e: unknown) {
      activeJobIdRef.current = null;
      if (e instanceof Error && e.name === 'AbortError') {
        return; // Cancelled silently
      }
      throw e;
    } finally {
      setIsStreaming(false);
    }
  }, [getToken, cancelStream]);

  return { isStreaming, startStream, cancelStream };
}
