import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

export type ExecStep = {
  id: string;
  label: string;
  icon: string;
  at: number;
};

export type JobQueueCallbacks = {
  onComplete?: (fullContent: string) => void;
  onChunk?: (partialContent: string) => void;
  onStep?: (step: ExecStep) => void;
  onStatus?: (msg: string) => void;
  onQueued?: (position: number) => void;
  onRunning?: () => void;
};

/**
 * Backend-managed job queue hook.
 * Replaces use-streaming.ts — same external interface but jobs persist on the
 * server even when the browser is closed.
 */
export function useJobQueue() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { getToken } = useAuth();
  const activeJobIdRef = useRef<string | null>(null);
  const abortEventSourceRef = useRef<(() => void) | null>(null);

  const cancelStream = useCallback(async () => {
    const jobId = activeJobIdRef.current;
    if (!jobId) return;

    abortEventSourceRef.current?.();

    try {
      const token = await getToken();
      await fetch(`${apiBase}/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch { /* silent */ }

    activeJobIdRef.current = null;
    setActiveJobId(null);
    setIsStreaming(false);
    setIsQueued(false);
    setQueuePosition(null);
  }, [getToken]);

  /** Connect to an existing job's SSE stream (used for reconnect after page reload). */
  const connectToJobStream = useCallback(async (
    jobId: string,
    callbacks: JobQueueCallbacks,
  ): Promise<void> => {
    const token = await getToken();
    let fullContent = '';

    await new Promise<void>((resolve, reject) => {
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        abortEventSourceRef.current = null;
        clearInterval(heartbeatWatchdog);
      };

      abortEventSourceRef.current = close;

      let abortCtrl: AbortController | null = new AbortController();

      let lastEventAt = Date.now();
      const heartbeatWatchdog = setInterval(() => {
        if (Date.now() - lastEventAt > 180_000) {
          clearInterval(heartbeatWatchdog);
          close();
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

                if (parsed.type === 'queued') {
                  setIsQueued(true);
                  setQueuePosition(parsed.position ?? null);
                  callbacks.onQueued?.(parsed.position);
                } else if (parsed.type === 'running') {
                  setIsQueued(false);
                  setQueuePosition(null);
                  callbacks.onRunning?.();
                } else if (parsed.type === 'step') {
                  setIsQueued(false);
                  setQueuePosition(null);
                  callbacks.onRunning?.();
                  callbacks.onStep?.({ id: parsed.id, label: parsed.label, icon: parsed.icon, at: Date.now() });
                } else if (parsed.type === 'text' && parsed.text) {
                  setIsQueued(false);
                  setQueuePosition(null);
                  fullContent += parsed.text;
                  callbacks.onChunk?.(fullContent);
                } else if (parsed.type === 'ping') {
                  // keep-alive
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

          close();
          resolve();
        } catch (e: unknown) {
          if (e instanceof Error && e.name === 'AbortError') {
            return;
          }
          close();
          reject(e);
        }
      })();

      const originalClose = close;
      abortEventSourceRef.current = () => {
        originalClose();
        abortCtrl?.abort();
        abortCtrl = null;
      };
    });

    callbacks.onComplete?.(fullContent);
  }, [getToken]);

  /**
   * Reconnect to an already-enqueued or running job (e.g. after page reload).
   * Returns the full output content when the job completes.
   */
  const reconnectToJob = useCallback(async (
    jobId: string,
    callbacks: JobQueueCallbacks,
  ): Promise<void> => {
    if (activeJobIdRef.current) {
      await cancelStream();
    }

    activeJobIdRef.current = jobId;
    setActiveJobId(jobId);
    setIsStreaming(true);
    setIsQueued(false);
    setQueuePosition(null);

    try {
      await connectToJobStream(jobId, callbacks);
    } catch (e: unknown) {
      activeJobIdRef.current = null;
      setActiveJobId(null);
      if (e instanceof Error && e.name === 'AbortError') return;
      throw e;
    } finally {
      activeJobIdRef.current = null;
      setActiveJobId(null);
      setIsStreaming(false);
      setIsQueued(false);
      setQueuePosition(null);
    }
  }, [cancelStream, connectToJobStream]);

  const startStream = useCallback(async (
    requestData: Record<string, unknown>,
    onComplete?: (fullContent: string) => void,
    onChunk?: (partialContent: string) => void,
    onStep?: (step: ExecStep) => void,
    onStatus?: (msg: string) => void,
    onQueued?: (position: number) => void,
    onRunning?: () => void,
    onJobCreated?: (jobId: string) => void,
  ) => {
    if (activeJobIdRef.current) {
      await cancelStream();
    }

    setIsStreaming(true);
    setIsQueued(false);
    setQueuePosition(null);

    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

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
      setActiveJobId(jobId);
      onJobCreated?.(jobId);

      await connectToJobStream(jobId, { onComplete, onChunk, onStep, onStatus, onQueued, onRunning });

      activeJobIdRef.current = null;
      setActiveJobId(null);
    } catch (e: unknown) {
      activeJobIdRef.current = null;
      setActiveJobId(null);
      if (e instanceof Error && e.name === 'AbortError') {
        return;
      }
      throw e;
    } finally {
      setIsStreaming(false);
      setIsQueued(false);
      setQueuePosition(null);
    }
  }, [getToken, cancelStream, connectToJobStream]);

  return { isStreaming, isQueued, queuePosition, activeJobId, startStream, cancelStream, reconnectToJob };
}
