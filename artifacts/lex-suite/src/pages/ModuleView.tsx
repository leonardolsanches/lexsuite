import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
const LLMSettingsModal = lazy(() => import('@/components/LLMSettingsModal'));
import { useLocation, Link } from 'wouter';
import { 
  useListWorkflows, 
  getListWorkflowsQueryKey,
  useCreateSession,
  useListSessions,
  getListSessionsQueryKey,
  useDeleteSession,
  type Session
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUser, useClerk, useAuth } from '@clerk/react';
import { 
  Wheat, 
  Scale, 
  FileText, 
  Plus, 
  X, 
  Play, 
  Copy, 
  Download, 
  Trash2, 
  LogOut, 
  ArrowLeft,
  Settings,
  Database,
  Square,
  Pause,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Brain,
  Shield,
  Search,
  Cpu,
  Zap,
  WifiOff,
  Wifi,
  FileText as FileTextIcon,
  BookOpen,
  CheckCheck
} from 'lucide-react';
import { useJobQueue, type ExecStep } from '@/hooks/use-job-queue';
import { usePdf } from '@/hooks/use-pdf';

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

type ModuleViewProps = {
  module: 'rural' | 'executio';
};

type ProcessTab = {
  id: string;
  sessionId?: number;
  jobId?: string;
  workflowKey: string | null;
  label: string;
  status: 'idle' | 'running' | 'done' | 'error';
  errorMessage?: string;
  phase?: 'extracting' | 'streaming';
  isQueued?: boolean;
  queuePosition?: number | null;
  startedAt?: number;
  endedAt?: number;
  execSteps: ExecStep[];
  mode: 'form' | 'paste' | 'pdf';
  formData: Record<string, any>;
  pasteText: string;
  outputHtml: string;
  pdfs: File[];
  savedToKb?: boolean;
  savingToKb?: boolean;
};

export default function ModuleView({ module }: ModuleViewProps) {
  const [location, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isLoaded: authLoaded, getToken } = useAuth();
  const { toast } = useToast();
  
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<ProcessTab[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [queuePaused, setQueuePaused] = useState(false);
  const queuePausedRef = useRef(false);
  const stopQueueRef = useRef(false);
  
  const { data: workflows = [] } = useListWorkflows({ 
    query: { queryKey: getListWorkflowsQueryKey() } 
  });
  
  const moduleWorkflows = workflows.filter(w => w.module === module).sort((a, b) => a.sortOrder - b.sortOrder);
  
  const createSession = useCreateSession();

  const { data: recentSessions = [] } = useListSessions(
    { module: module as any, limit: 15 },
    { query: { refetchOnWindowFocus: false } as any }
  );
  const doneSessions = recentSessions.filter(s => s.outputHtml && (s.status === 'done' || s.status === 'running'));
  
  const { isStreaming, isQueued, queuePosition, reconnectToJob, startStream, cancelStream } = useJobQueue();
  const { isLoaded: pdfLoaded, extractText } = usePdf();

  // Keep a ref to always-fresh tabs for use inside async callbacks
  const tabsRef = useRef<ProcessTab[]>([]);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [thinkMode, setThinkMode] = useState<'deep' | 'fast'>('deep');

  // ── LLM connectivity status ───────────────────────────────────────────────
  type LlmStatus = 'checking' | 'online' | 'fallback' | 'degraded' | 'offline' | 'unconfigured';
  const [llmStatus, setLlmStatus] = useState<LlmStatus>('checking');
  const [llmProvider, setLlmProvider] = useState<'anthropic' | 'ollama' | 'none'>('none');
  const checkLlm = useCallback(async () => {
    setLlmStatus('checking');
    try {
      const res = await fetch(`${apiBase}/api/llm-status`);
      if (!res.ok) { setLlmStatus('degraded'); return; }
      const data = await res.json() as {
        configured: boolean; online: boolean; provider?: string; hasFallback?: boolean;
      };
      const prov = (data.provider === 'anthropic' ? 'anthropic' : data.provider === 'ollama' ? 'ollama' : 'none') as 'anthropic' | 'ollama' | 'none';
      setLlmProvider(prov);
      if (!data.configured) setLlmStatus('unconfigured');
      else if (data.online) setLlmStatus('online');
      // Ollama down but Claude fallback available → analyses still work silently
      else if (data.hasFallback) setLlmStatus('fallback');
      else setLlmStatus('degraded');
    } catch { setLlmStatus('degraded'); }
  }, []);
  // Wait for Clerk to be fully loaded before first check
  useEffect(() => { if (authLoaded) checkLlm(); }, [authLoaded, checkLlm]);

  // Warn before tab close/refresh when an analysis is running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isStreaming) {
        e.preventDefault();
        e.returnValue = 'Uma análise está em andamento. Sair agora vai perder o progresso. Tem certeza?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStreaming]);

  // Tick every second while any tab is running (drives the live elapsed timer)
  const [, setTick] = useState(0);
  const anyRunning = tabs.some(t => t.status === 'running');
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [anyRunning]);

  // Track whether we've already attempted reconnect for this page load
  const reconnectAttemptedRef = useRef(false);

  // On mount: (1) reconnect to any running/queued job, (2) surface recently
  // completed background jobs so the user can access results after page reload.
  useEffect(() => {
    if (!authLoaded || reconnectAttemptedRef.current || isStreaming) return;
    reconnectAttemptedRef.current = true;

    (async () => {
      try {
        const token = await getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // ── 1. Reconnect to active (running/queued) job ───────────────────
        const activeRes = await fetch(
          `${apiBase}/api/jobs?status=running,queued&limit=5&module=${module}`,
          { headers }
        );

        let foundActiveJob = false;
        if (activeRes.ok) {
          const activeJobs = await activeRes.json() as Array<{
            id: string; workflowKey: string; module: string; status: string;
            outputHtml?: string | null;
          }>;

          const activeJob = activeJobs.find(
            j => j.module === module && (j.status === 'running' || j.status === 'queued')
          );

          if (activeJob) {
            foundActiveJob = true;
            const recoveryId = crypto.randomUUID();
            const recoveryTab: ProcessTab = {
              id: recoveryId,
              jobId: activeJob.id,
              workflowKey: activeJob.workflowKey,
              label: activeJob.workflowKey,
              status: 'running',
              isQueued: activeJob.status === 'queued',
              queuePosition: null,
              execSteps: [],
              mode: 'form',
              formData: {},
              pasteText: '',
              outputHtml: activeJob.outputHtml ?? '',
              pdfs: [],
              startedAt: Date.now(),
            };

            setTabs(prev => {
              if (prev.some(t => t.jobId === activeJob.id)) return prev;
              return [...prev, recoveryTab];
            });
            setActiveTabId(recoveryId);

            await reconnectToJob(activeJob.id, {
              onQueued: (position) => {
                setTabs(prev => prev.map(t => t.id === recoveryId ? { ...t, isQueued: true, queuePosition: position } : t));
              },
              onRunning: () => {
                setTabs(prev => prev.map(t => t.id === recoveryId ? { ...t, isQueued: false, queuePosition: null } : t));
              },
              onStep: (step) => {
                setTabs(prev => prev.map(t => t.id === recoveryId
                  ? { ...t, execSteps: [...t.execSteps, step], isQueued: false, queuePosition: null }
                  : t));
              },
              onChunk: (partial) => {
                setTabs(prev => prev.map(t => t.id === recoveryId
                  ? { ...t, outputHtml: partial, isQueued: false, queuePosition: null }
                  : t));
              },
              onComplete: (fullContent) => {
                setTabs(prev => prev.map(t => t.id === recoveryId
                  ? { ...t, status: 'done', outputHtml: fullContent, endedAt: Date.now(), isQueued: false, queuePosition: null }
                  : t));
              },
            });
          }
        }

        // ── 2. Surface recently completed background jobs ─────────────────
        const doneRes = await fetch(
          `${apiBase}/api/jobs?status=done&limit=5&module=${module}`,
          { headers }
        );
        if (!doneRes.ok) return;

        const doneJobs = await doneRes.json() as Array<{
          id: string; workflowKey: string; module: string;
          outputHtml?: string | null; finishedAt?: string | null;
        }>;

        const withOutput = doneJobs.filter(j => j.outputHtml?.trim());
        if (withOutput.length === 0) return;

        // Dedup against tabs already open (including the reconnected active job)
        const existingJobIds = new Set(tabsRef.current.map(t => t.jobId).filter(Boolean));
        const freshDone: ProcessTab[] = withOutput
          .filter(j => !existingJobIds.has(j.id))
          .map(j => ({
            id: crypto.randomUUID(),
            jobId: j.id,
            workflowKey: j.workflowKey,
            label: j.workflowKey,
            status: 'done' as const,
            execSteps: [],
            mode: 'form' as const,
            formData: {},
            pasteText: '',
            outputHtml: j.outputHtml ?? '',
            pdfs: [],
            endedAt: j.finishedAt ? new Date(j.finishedAt).getTime() : Date.now(),
          }));

        if (freshDone.length === 0) return;

        setTabs(prev => {
          const nowIds = new Set(prev.map(t => t.jobId).filter(Boolean));
          const toAdd = freshDone.filter(t => !nowIds.has(t.jobId!));
          if (toAdd.length === 0) return prev;

          // Remove the initial blank placeholder tab (created by useEffect([module]))
          // so the first thing the user sees is their completed results.
          const withoutBlank = prev.filter(t =>
            t.outputHtml || t.jobId || t.sessionId || t.workflowKey
          );
          return [...withoutBlank, ...toAdd];
        });

        // Make the most recent done tab active if nothing else is active
        if (!foundActiveJob) {
          setActiveTabId(freshDone[0].id);
        }

        toast({
          title: `${freshDone.length} análise${freshDone.length > 1 ? 's' : ''} concluída${freshDone.length > 1 ? 's' : ''} em segundo plano`,
          description: 'Os resultados estão carregados nas abas.',
        });
      } catch {
        // silent — reconnect is best-effort
      }
    })();
  }, [authLoaded, module]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create a new tab
  const handleNewProcess = () => {
    if (tabs.length >= 8) {
      toast({ title: 'Limite atingido', description: 'Máximo de 8 abas simultâneas.', variant: 'destructive' });
      return;
    }
    const newId = Math.random().toString(36).substr(2, 9);
    const newTab: ProcessTab = {
      id: newId,
      workflowKey: null,
      label: `Processo ${tabs.length + 1}`,
      status: 'idle',
      execSteps: [],
      mode: 'form',
      formData: {},
      pasteText: '',
      outputHtml: '',
      pdfs: []
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  useEffect(() => {
    if (tabs.length === 0) {
      handleNewProcess();
    }
  }, [module]); // on module change, reset and create one

  // Theme setup
  useEffect(() => {
    document.body.className = `dark theme-${module}`;
    return () => {
      document.body.className = 'dark';
    };
  }, [module]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateTab = (id: string, updates: Partial<ProcessTab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const updateActiveTab = (updates: Partial<ProcessTab>) => {
    if (activeTabId) updateTab(activeTabId, updates);
  };

  // Formats elapsed time for a tab: live when running, fixed when done
  const formatElapsed = (tab: ProcessTab): string => {
    if (!tab.startedAt) return '';
    const endMs = tab.endedAt ?? Date.now();
    const totalSec = Math.floor((endMs - tab.startedAt) / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;
    return mm > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss}s`;
  };

  // Abort the currently running stream and mark the tab as cancelled
  const handleCancelTab = (tabId: string) => {
    const tab = tabsRef.current.find(t => t.id === tabId);
    if (tab?.status !== 'running') return;
    cancelStream();
    stopQueueRef.current = true; // signals the queue loop to exit after this
    updateTab(tabId, { status: 'error', phase: undefined, endedAt: Date.now(), outputHtml: '' });
    queuePausedRef.current = false;
    setQueuePaused(false);
    // isRunningAll will be cleared by handleRunAll's finally block
  };

  // Reset a tab and re-run its analysis
  const handleRestartTab = (tabId: string) => {
    const tab = tabsRef.current.find(t => t.id === tabId);
    if (!tab || !tab.workflowKey || tab.status === 'running') return;
    updateTab(tabId, { status: 'idle', outputHtml: '', startedAt: undefined, endedAt: undefined, phase: undefined });
    setActiveTabId(tabId);
    setTimeout(() => handleRunAnalysisForTab(tabId), 80);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    } else if (newTabs.length === 0) {
      handleNewProcess();
    }
  };

  const openSessionTab = useCallback((session: Session) => {
    const newId = crypto.randomUUID();
    const newTab: ProcessTab = {
      id: newId,
      workflowKey: session.workflowKey,
      label: session.label,
      status: 'done',
      execSteps: [],
      mode: 'form',
      formData: {},
      pasteText: '',
      outputHtml: session.outputHtml ?? '',
      pdfs: [],
      sessionId: session.id,
      endedAt: new Date(session.updatedAt).getTime(),
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  }, []);

  const handleSelectWorkflow = (workflowKey: string) => {
    if (!activeTab) return;
    const wf = moduleWorkflows.find(w => w.key === workflowKey);
    updateActiveTab({ 
      workflowKey, 
      label: wf?.name || 'Sem título',
      formData: {}, // reset
      outputHtml: ''
    });
  };

  const handleRunAnalysisForTab = async (tabId: string) => {
    const tab = tabsRef.current.find(t => t.id === tabId);
    if (!tab || !tab.workflowKey) return;
    if (tab.status === 'running') return;

    updateTab(tabId, { status: 'running', outputHtml: '', startedAt: Date.now(), phase: 'extracting', execSteps: [] });

    // Extract PDF text — either from dedicated pdf mode or pdfs attached in form mode
    let pdfExtractedText = '';
    const pdfsToExtract = tab.mode === 'pdf' ? tab.pdfs : (tab.pdfs.length > 0 ? tab.pdfs : []);
    if (pdfsToExtract.length > 0 && (tab.mode === 'pdf' || tab.mode === 'form')) {
      try {
        for (const file of pdfsToExtract) {
          const text = await extractText(file);
          pdfExtractedText += `\n\n--- Documento: ${file.name} ---\n\n${text}`;
        }
      } catch (err) {
        toast({ title: 'Falha na extração do PDF', variant: 'destructive' });
        updateTab(tabId, { status: 'error' });
        return;
      }
    }

    updateTab(tabId, { phase: 'streaming' });

    const payloadFormData = { ...tab.formData };

    const requestData = {
      workflowKey: tab.workflowKey,
      module,
      mode: tab.mode,
      thinkMode,
      formData: tab.mode === 'form' ? payloadFormData : undefined,
      pasteText: tab.mode === 'paste'
        ? tab.pasteText
        : (tab.mode === 'pdf' || pdfExtractedText ? pdfExtractedText : undefined),
    };

    // sessionId declared outside try so catch block can access it
    let sessionId = tab.sessionId;

    try {
      // Try to create/reuse session — fail silently if DB Bridge is unavailable
      if (!sessionId) {
        try {
          const session = await createSession.mutateAsync({
            data: {
              workflowKey: tab.workflowKey,
              module,
              label: tab.label,
              mode: tab.mode,
              formData: JSON.stringify(payloadFormData),
            }
          });
          sessionId = session.id;
          updateTab(tabId, { sessionId });
        } catch {
          // DB Bridge offline or no permissions — continue without session persistence
        }
      }

      await startStream(
        { ...requestData, sessionId },
        // onComplete — final state, locks in result
        (fullContent) => {
          updateTab(tabId, { status: 'done', outputHtml: fullContent, endedAt: Date.now(), isQueued: false, queuePosition: null });
        },
        // onChunk — live streaming to the correct tab
        (partial) => {
          updateTab(tabId, { outputHtml: partial, phase: 'streaming', isQueued: false, queuePosition: null });
        },
        // onStep — append a new execution step to the activity log
        (step) => {
          setTabs(prev => prev.map(t =>
            t.id === tabId ? { ...t, execSteps: [...t.execSteps, step], isQueued: false, queuePosition: null } : t
          ));
        },
        // onStatus (unused, reserved)
        undefined,
        // onQueued — job is waiting in queue
        (position) => {
          updateTab(tabId, { isQueued: true, queuePosition: position });
        },
        // onRunning — job started executing
        () => {
          updateTab(tabId, { isQueued: false, queuePosition: null });
        },
        // onJobCreated — store jobId for possible reconnect
        (jobId) => {
          updateTab(tabId, { jobId });
        },
      );

      // Recovery: if stream ended with no visible content, try to load saved session result
      const tabAfter = tabsRef.current.find(t => t.id === tabId);
      if (!tabAfter?.outputHtml && sessionId) {
        try {
          await new Promise(r => setTimeout(r, 1500));
          const token = await getToken();
          const resp = await fetch(`/api/sessions/${sessionId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (resp.ok) {
            const saved = await resp.json();
            if (saved.outputHtml) {
              updateTab(tabId, { status: 'done', outputHtml: saved.outputHtml, endedAt: Date.now() });
            }
          }
        } catch { /* silent — bridge pode estar offline */ }
      }

    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      // Recovery: on error, try to load saved session result before showing error
      if (sessionId) {
        try {
          await new Promise(r => setTimeout(r, 1500));
          const token = await getToken();
          const resp = await fetch(`/api/sessions/${sessionId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (resp.ok) {
            const saved = await resp.json();
            if (saved.outputHtml) {
              updateTab(tabId, { status: 'done', outputHtml: saved.outputHtml, endedAt: Date.now() });
              return;
            }
          }
        } catch { /* silent */ }
      }
      updateTab(tabId, { status: 'error', errorMessage: msg, outputHtml: '', endedAt: Date.now() });
      // Trigger LLM status re-check so badge updates
      checkLlm();
    }
  };

  const handleRunAnalysis = async () => {
    if (!activeTab || !activeTab.workflowKey) {
      toast({ title: 'Selecione um workflow primeiro', variant: 'destructive' });
      return;
    }
    if (isStreaming || isRunningAll) return;
    await handleRunAnalysisForTab(activeTab.id);
  };

  const handleRunAll = async () => {
    if (isStreaming || isRunningAll) return;
    const withWorkflow = tabsRef.current.filter(t => t.workflowKey);
    if (withWorkflow.length === 0) {
      toast({ title: 'Nenhum processo configurado', description: 'Configure pelo menos um processo com workflow selecionado.', variant: 'destructive' });
      return;
    }
    queuePausedRef.current = false;
    stopQueueRef.current = false;
    setQueuePaused(false);
    setIsRunningAll(true);
    let completed = 0;
    try {
      for (const tab of withWorkflow) {
        if (stopQueueRef.current) break; // user cancelled

        // Wait if queue is paused — poll every 400ms
        while (queuePausedRef.current && !stopQueueRef.current) {
          await new Promise(r => setTimeout(r, 400));
        }
        if (stopQueueRef.current) break;

        // Skip closed tabs
        if (!tabsRef.current.some(t => t.id === tab.id)) continue;

        setActiveTabId(tab.id);
        await new Promise(r => setTimeout(r, 100));
        await handleRunAnalysisForTab(tab.id);

        if (stopQueueRef.current) break;
        completed++;
      }
    } finally {
      setIsRunningAll(false);
      queuePausedRef.current = false;
      stopQueueRef.current = false;
      setQueuePaused(false);
    }
    if (completed > 0) {
      toast({
        title: `${completed} processo(s) concluído(s)!`,
        description: completed < withWorkflow.length
          ? 'Fila interrompida antes do fim.'
          : 'Todas as análises foram finalizadas.'
      });
    }
  };

  const handlePauseQueue = () => {
    queuePausedRef.current = true;
    setQueuePaused(true);
  };

  const handleResumeQueue = () => {
    queuePausedRef.current = false;
    setQueuePaused(false);
  };

  // Map server-sent icon names to Lucide components
  const stepIcon = (icon: string, cls = 'w-4 h-4') => {
    const props = { className: cls };
    switch (icon) {
      case 'cpu': return <Cpu {...props} />;
      case 'shield': return <Shield {...props} />;
      case 'file-text': return <FileTextIcon {...props} />;
      case 'search': return <Search {...props} />;
      case 'brain': return <Brain {...props} />;
      case 'zap': return <Zap {...props} />;
      default: return <Loader2 {...props} />;
    }
  };

  // Group workflows by category
  const categories = Array.from(new Set(moduleWorkflows.map(w => w.category || 'General')));

  const renderFormFields = () => {
    if (!activeTab || !activeTab.workflowKey) return <div className="text-muted-foreground p-4 text-center">Selecione um workflow na barra lateral.</div>;
    
    const wf = moduleWorkflows.find(w => w.key === activeTab.workflowKey);
    if (!wf) return null;

    let parsed: any = [];
    try {
      parsed = JSON.parse(wf.fields);
    } catch(e) {
      return <div>Campos do workflow inválidos</div>;
    }

    const renderField = (f: any) => (
      <div key={f.id} className="space-y-2">
        <label className="text-sm font-medium text-foreground">{f.label}</label>
        {f.type === 'text' || f.type === 'date' ? (
          <Input
            type={f.type}
            value={activeTab.formData[f.id] || ''}
            onChange={(e) => updateActiveTab({ formData: { ...activeTab.formData, [f.id]: e.target.value } })}
            className="bg-input border-border"
          />
        ) : f.type === 'textarea' ? (
          <Textarea
            value={activeTab.formData[f.id] || ''}
            onChange={(e) => updateActiveTab({ formData: { ...activeTab.formData, [f.id]: e.target.value } })}
            className="bg-input border-border min-h-[100px]"
          />
        ) : f.type === 'radio' ? (
          <div className="flex flex-wrap gap-2">
            {f.options?.map((opt: string) => (
              <button
                key={opt}
                onClick={() => updateActiveTab({ formData: { ...activeTab.formData, [f.id]: opt } })}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  activeTab.formData[f.id] === opt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : f.type === 'checkbox' ? (
          <div className="flex flex-wrap gap-2">
            {f.options?.map((opt: string) => {
              const currentVals = activeTab.formData[f.id] || [];
              const isSelected = currentVals.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => {
                    const newVals = isSelected
                      ? currentVals.filter((v: string) => v !== opt)
                      : [...currentVals, opt];
                    updateActiveTab({ formData: { ...activeTab.formData, [f.id]: newVals } });
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : f.type === 'multidate' ? (
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Ex: 10/03/2024, 10/06/2024"
              value={activeTab.formData[f.id] || ''}
              onChange={(e) => updateActiveTab({ formData: { ...activeTab.formData, [f.id]: e.target.value } })}
              className="bg-input border-border"
            />
          </div>
        ) : null}
      </div>
    );

    const isGrouped = parsed.length > 0 && parsed[0].group !== undefined;

    if (isGrouped) {
      return (
        <div className="space-y-8">
          {parsed.map((grp: any) => (
            <div key={grp.group} className="space-y-4">
              <div className="border-b border-primary/30 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{grp.group}</p>
              </div>
              <div className="space-y-4">
                {grp.fields?.map((f: any) => renderField(f))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {parsed.map((f: any) => renderField(f))}
      </div>
    );
  };

  const handleCopyResult = async () => {
    if (!activeTab?.outputHtml) return;
    // Strip any HTML tags, decode entities, get plain text
    const tmp = document.createElement('div');
    tmp.innerHTML = activeTab.outputHtml.replace(/\n/g, '\n');
    const plainText = tmp.innerText || tmp.textContent || activeTab.outputHtml;
    try {
      await navigator.clipboard.writeText(plainText);
      toast({ title: 'Copiado para a área de transferência' });
    } catch {
      toast({ title: 'Falha ao copiar', variant: 'destructive' });
    }
  };

  const handleExportPdf = () => {
    if (!activeTab?.outputHtml) return;
    const wf = moduleWorkflows.find(w => w.key === activeTab.workflowKey);
    const title = wf?.name || activeTab.label || 'Análise';
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Convert plain text with newlines to HTML paragraphs
    const bodyHtml = activeTab.outputHtml
      .split('\n')
      .map(line => {
        const t = line.trim();
        if (!t) return '<br/>';
        // Bold markers **text**
        const formatted = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Section headers like "SEÇÃO 1 —" or "1." at start
        if (/^(SEÇÃO|FASE|ETAPA|#{1,3})\s/i.test(t) || /^\d+\.\s+[A-ZÁÉÍÓÚÀÃÕÇ]/.test(t)) {
          return `<p class="section">${formatted}</p>`;
        }
        return `<p>${formatted}</p>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { margin: 2.5cm 2cm; }
  body { font-family: 'Georgia', serif; font-size: 12pt; line-height: 1.7; color: #111; }
  h1 { font-size: 16pt; margin-bottom: 4pt; }
  .meta { font-size: 10pt; color: #555; margin-bottom: 24pt; border-bottom: 1px solid #ccc; padding-bottom: 8pt; }
  p { margin: 0 0 6pt 0; text-align: justify; }
  p.section { font-weight: bold; margin-top: 14pt; margin-bottom: 4pt; }
  strong { font-weight: bold; }
  br { display: block; margin: 4pt 0; }
</style>
</head>
<body>
<h1>${title}</h1>
<div class="meta">Gerado em ${date} — Lex Suite</div>
${bodyHtml}
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      toast({ title: 'Permita pop-ups para exportar o PDF', variant: 'destructive' });
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleSaveToKb = async () => {
    if (!activeTab || !activeTab.outputHtml || activeTab.status !== 'done') return;

    updateActiveTab({ savingToKb: true });

    try {
      const token = await getToken();
      const wf = moduleWorkflows.find(w => w.key === activeTab.workflowKey);
      const label = wf ? `${wf.name} — ${activeTab.label}` : activeTab.label;

      const res = await fetch(`${apiBase}/api/knowledge/save-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          label,
          workflowKey: activeTab.workflowKey ?? undefined,
          module,
          outputText: activeTab.outputHtml,
          sessionId: activeTab.sessionId ? String(activeTab.sessionId) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        toast({ title: 'Falha ao salvar', description: err.error ?? 'Tente novamente.', variant: 'destructive' });
        updateActiveTab({ savingToKb: false });
        return;
      }

      const data = await res.json();
      updateActiveTab({ savingToKb: false, savedToKb: true });
      toast({
        title: 'Salvo na base de conhecimento',
        description: `${data.chunksIndexed} trecho(s) indexado(s). Análises futuras similares vão referenciar este parecer.`,
      });
    } catch (err: any) {
      toast({ title: 'Erro de rede', description: err?.message ?? 'Tente novamente.', variant: 'destructive' });
      updateActiveTab({ savingToKb: false });
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) {
        updateActiveTab({ pdfs: [...(activeTab?.pdfs || []), ...files] });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* LLM settings modal */}
      <Suspense fallback={null}>
        <LLMSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => { setSettingsOpen(false); checkLlm(); }}
        />
      </Suspense>

      {/* Header */}
      <header className="h-[60px] shrink-0 border-b border-border bg-card px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-muted-foreground hover:text-foreground transition-colors mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="h-8 w-8 bg-background border border-border rounded flex items-center justify-center">
            <span className="font-serif italic font-semibold text-primary text-lg">ℓ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-lg tracking-wide">Lex {module === 'rural' ? 'Rural' : 'Executio'}</span>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-primary/30 text-primary bg-primary/10`}>
              Premium
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* LLM status indicator — click to open settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Configurar motor de IA"
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
              llmStatus === 'online'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                : llmStatus === 'fallback'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                : llmStatus === 'checking'
                ? 'border-muted-foreground/20 bg-muted/30 text-muted-foreground'
                : llmStatus === 'degraded'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                : 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
            }`}
          >
            {llmStatus === 'online' && <><Wifi className="w-3 h-3" /> IA online</>}
            {llmStatus === 'fallback' && <><Wifi className="w-3 h-3" /> IA ativa</>}
            {llmStatus === 'degraded' && <><Wifi className="w-3 h-3" /> IA instável</>}
            {llmStatus === 'offline' && <><WifiOff className="w-3 h-3" /> IA offline</>}
            {llmStatus === 'unconfigured' && <><WifiOff className="w-3 h-3" /> IA não configurada</>}
            {llmStatus === 'checking' && <><Loader2 className="w-3 h-3 animate-spin" /> Verificando...</>}
          </button>
          <Link href={`/app/${module}/documents`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
              <Database className="w-4 h-4" />
              Curador RAG
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sair">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Offline / degraded warning banner */}
      {llmStatus === 'unconfigured' && (
        <div className="shrink-0 bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center gap-3">
          <WifiOff className="w-4 h-4 text-destructive shrink-0" />
          <div className="flex-1 text-sm text-destructive">
            OLLAMA_BASE_URL não configurado — adicione a URL do túnel nas configurações do servidor.
          </div>
          <button onClick={checkLlm} className="text-xs text-destructive/70 hover:text-destructive underline shrink-0">
            Verificar novamente
          </button>
        </div>
      )}
      {llmStatus === 'degraded' && (
        <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-3">
          <Wifi className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 text-sm text-amber-600 dark:text-amber-400">
            {llmProvider === 'ollama'
              ? 'Mini PC indisponível e sem alternativa configurada. Verifique o túnel ou configure a chave Claude nas configurações.'
              : 'Motor de IA instável ou inacessível. Verifique as configurações.'}
          </div>
          <button onClick={checkLlm} className="text-xs text-amber-500/70 hover:text-amber-500 underline shrink-0">
            Verificar novamente
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[260px] shrink-0 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fluxos de Trabalho</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-6">
              {categories.map(cat => (
                <div key={cat} className="space-y-1">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                    {cat}
                  </div>
                  {moduleWorkflows.filter(w => (w.category || 'General') === cat).map((wf, idx) => (
                    <button
                      key={wf.key}
                      onClick={() => handleSelectWorkflow(wf.key)}
                      className={`w-full text-left p-3 rounded-md transition-colors border ${
                        activeTab?.workflowKey === wf.key 
                          ? 'bg-primary/10 border-primary text-primary' 
                          : 'border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs mt-0.5 opacity-50">{String(idx + 1).padStart(2, '0')}</span>
                        <div>
                          <div className={`font-medium text-sm ${activeTab?.workflowKey === wf.key ? 'text-primary' : 'text-foreground'}`}>
                            {wf.name}
                          </div>
                          <div className="text-xs opacity-70 mt-1 line-clamp-2 leading-relaxed">
                            {wf.subtitle}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Session history — quick-reopen past completed analyses */}
            {doneSessions.length > 0 && (
              <div className="space-y-1 pt-2">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Histórico
                </div>
                {doneSessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => openSessionTab(s)}
                    className="w-full text-left p-2 rounded-md transition-colors border border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  >
                    <div className="flex items-start gap-1.5">
                      <div className="text-xs font-medium text-foreground truncate flex-1">{s.label}</div>
                      {s.status === 'running' && (
                        <span className="text-[9px] font-medium text-amber-500 bg-amber-500/10 px-1 rounded shrink-0 mt-0.5">parcial</span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-60 mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {/* Tabs Bar */}
          <div className="h-12 border-b border-border bg-card flex items-center px-2 shrink-0 overflow-x-auto no-scrollbar">
            {tabs.map((tab, idx) => (
              <div 
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-1.5 h-9 px-3 min-w-[140px] max-w-[220px] border-r border-l border-t rounded-t-md mx-0.5 cursor-pointer transition-colors ${
                  activeTabId === tab.id 
                    ? 'bg-background border-border text-foreground' 
                    : 'bg-card border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`text-[10px] font-mono shrink-0 ${
                  tab.status === 'running' ? 'text-primary' :
                  tab.status === 'done' ? 'text-emerald-500' :
                  tab.status === 'error' ? 'text-destructive' : 'opacity-40'
                }`}>P{idx + 1}</span>
                <span className="text-sm truncate flex-1">{tab.label}</span>
                
                {tab.status === 'running' && (
                  <span className="font-mono text-[10px] text-primary shrink-0 tabular-nums">{formatElapsed(tab)}</span>
                )}
                {tab.status === 'done' && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                )}
                {tab.status === 'error' && (
                  <AlertCircle className="w-3 h-3 text-destructive shrink-0" />
                )}
                
                <button 
                  onClick={(e) => closeTab(e, tab.id)}
                  className="w-4 h-4 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNewProcess}
              className="ml-2 text-muted-foreground h-8 px-2 shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" /> Novo
            </Button>
            <div className="flex-1"></div>

            {/* Queue controls — visible only when a sequential run is active */}
            {isRunningAll && (
              <div className="flex items-center gap-1 mr-2 shrink-0">
                {queuePaused ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResumeQueue}
                    className="h-8 px-2 gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                    title="Continuar fila"
                  >
                    <Play className="w-3 h-3 fill-current" /> Continuar
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePauseQueue}
                    className="h-8 px-2 gap-1.5 text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                    title="Pausar após processo atual"
                  >
                    <Pause className="w-3 h-3" /> Pausar Fila
                  </Button>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRunAll}
              disabled={isStreaming || isRunningAll || tabs.filter(t => t.workflowKey).length === 0}
              className="h-8 gap-2 shrink-0 border-primary/40 text-primary hover:bg-primary/10"
              data-testid="btn-executar-todos"
              title="Executa todos os processos de P1 a Pn em sequência"
            >
              {isRunningAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 fill-primary" />
              )}
              Executar Todos
            </Button>
            {/* Think mode toggle — only relevant for local deepseek */}
            {llmProvider !== 'anthropic' && (
              <div className="flex items-center h-8 rounded-md border border-border overflow-hidden shrink-0 ml-1">
                <button
                  onClick={() => setThinkMode('fast')}
                  title="Rápido: desativa o raciocínio estendido. 3-5× mais veloz, resultado direto."
                  className={`px-2.5 h-full text-xs transition-colors ${thinkMode === 'fast' ? 'bg-amber-500 text-white font-medium' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  ⚡ Rápido
                </button>
                <button
                  onClick={() => setThinkMode('deep')}
                  title="Profundo: raciocínio estendido ativo. Máxima profundidade, mais lento."
                  className={`px-2.5 h-full text-xs transition-colors border-l border-border ${thinkMode === 'deep' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  🧠 Profundo
                </button>
              </div>
            )}
            <Button 
              variant="default" 
              size="sm"
              onClick={handleRunAnalysis}
              disabled={!activeTab?.workflowKey || activeTab?.status === 'running' || isRunningAll}
              className="h-8 gap-2 ml-2 shrink-0"
              data-testid="btn-executar"
            >
              <Play className="w-3 h-3" />
              Executar
            </Button>
          </div>

          {/* Process Manager Panel — visible when 2+ tabs exist */}
          {tabs.length > 1 && (
            <div className="border-b border-border bg-card/40 px-3 py-1.5 shrink-0 flex items-center gap-3 overflow-x-auto no-scrollbar">
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest shrink-0">Processos</span>
              <div className="flex items-center gap-2 flex-1">
                {tabs.map((tab, idx) => {
                  const isActive = tab.id === activeTabId;
                  const elapsed = formatElapsed(tab);
                  return (
                    <div
                      key={tab.id}
                      className={`flex items-center gap-1.5 shrink-0 rounded-md px-2 py-1 text-xs border transition-all ${
                        tab.status === 'running'
                          ? 'border-primary/50 bg-primary/5 text-primary'
                          : tab.status === 'done'
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500'
                          : tab.status === 'error'
                          ? 'border-destructive/30 bg-destructive/5 text-destructive'
                          : isActive
                          ? 'border-border bg-muted/30 text-foreground'
                          : 'border-border/50 bg-transparent text-muted-foreground'
                      }`}
                    >
                      {/* Status icon */}
                      {tab.status === 'running' && !tab.isQueued && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                      {tab.status === 'running' && tab.isQueued && <Clock className="w-3 h-3 shrink-0 text-amber-500" />}
                      {tab.status === 'done' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                      {tab.status === 'error' && <AlertCircle className="w-3 h-3 shrink-0" />}
                      {tab.status === 'idle' && <Clock className="w-3 h-3 shrink-0 opacity-40" />}

                      {/* Label */}
                      <button
                        onClick={() => setActiveTabId(tab.id)}
                        className="font-mono text-[10px] shrink-0 hover:underline"
                        title={tab.label}
                      >
                        P{idx + 1}
                      </button>
                      <span className="max-w-[90px] truncate text-[10px] opacity-80">{tab.label}</span>

                      {/* Elapsed time */}
                      {elapsed && (
                        <span className="font-mono text-[10px] tabular-nums opacity-70 shrink-0">{elapsed}</span>
                      )}

                      {/* Action: cancel if running */}
                      {tab.status === 'running' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancelTab(tab.id); }}
                          title="Cancelar processo"
                          className="ml-0.5 rounded p-0.5 hover:bg-destructive/20 text-destructive/70 hover:text-destructive transition-colors shrink-0"
                        >
                          <Square className="w-2.5 h-2.5 fill-current" />
                        </button>
                      )}

                      {/* Action: restart if error or done */}
                      {(tab.status === 'error' || tab.status === 'done') && tab.workflowKey && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestartTab(tab.id); }}
                          title="Reiniciar análise"
                          className="ml-0.5 rounded p-0.5 hover:bg-primary/20 opacity-60 hover:opacity-100 transition-all shrink-0"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {/* Queue paused indicator */}
                      {tab.status === 'idle' && queuePaused && isRunningAll && idx > 0 && (
                        <span className="text-[9px] text-amber-500 shrink-0">em espera</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Queue paused banner */}
              {queuePaused && isRunningAll && (
                <div className="flex items-center gap-1.5 shrink-0 text-amber-500">
                  <Pause className="w-3 h-3" />
                  <span className="text-[10px]">Fila pausada</span>
                </div>
              )}
            </div>
          )}

          {/* Split View */}
          {activeTab ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: Inputs */}
              <div className="w-[420px] shrink-0 border-r border-border bg-card flex flex-col">
                <Tabs 
                  value={activeTab.mode} 
                  onValueChange={(val: any) => updateActiveTab({ mode: val })}
                  className="flex flex-col h-full"
                >
                  <div className="p-3 border-b border-border shrink-0">
                    <TabsList className="w-full grid grid-cols-3 bg-background">
                      <TabsTrigger value="form" className="text-xs">Formulário</TabsTrigger>
                      <TabsTrigger value="paste" className="text-xs">Colar Texto</TabsTrigger>
                      <TabsTrigger value="pdf" className="text-xs">Upload PDF</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-6">
                        <TabsContent value="form" className="m-0 border-0 p-0 space-y-6">
                          {renderFormFields()}
                          {/* PDF attachment within guided form */}
                          <div className="space-y-3 pt-2 border-t border-border/50">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anexar PDFs ao formulário (opcional)</p>
                            <div className="flex items-center gap-3">
                              <Input 
                                type="file" 
                                accept="application/pdf" 
                                multiple 
                                className="hidden" 
                                id={`form-pdf-upload-${activeTab?.id}`}
                                onChange={handlePdfUpload}
                              />
                              <Button variant="outline" size="sm" asChild className="text-xs border-dashed">
                                <label htmlFor={`form-pdf-upload-${activeTab?.id}`} className="cursor-pointer gap-2 flex items-center">
                                  <FileText className="w-3.5 h-3.5" /> Selecionar PDFs
                                </label>
                              </Button>
                              {activeTab && activeTab.pdfs.length > 0 && (
                                <span className="text-xs text-primary font-medium">{activeTab.pdfs.length} arquivo(s) anexado(s)</span>
                              )}
                            </div>
                            {activeTab && activeTab.pdfs.length > 0 && (
                              <div className="space-y-1.5">
                                {activeTab.pdfs.map((pdf, i) => (
                                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                      <span className="text-xs truncate">{pdf.name}</span>
                                    </div>
                                    <button onClick={() => updateActiveTab({ pdfs: activeTab.pdfs.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive shrink-0 ml-2">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="paste" className="m-0 border-0 p-0 h-full flex flex-col space-y-4">
                          <div className="space-y-2 flex-1 flex flex-col">
                            <label className="text-sm font-medium text-foreground">Colar Texto do Documento</label>
                            <Textarea 
                              value={activeTab.pasteText}
                              onChange={(e) => updateActiveTab({ pasteText: e.target.value })}
                              placeholder="Cole aqui o contrato, petição, decisão ou qualquer texto para análise..."
                              className="flex-1 bg-input border-border min-h-[400px] resize-none font-mono text-sm leading-relaxed"
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="pdf" className="m-0 border-0 p-0 space-y-4">
                          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-background hover:bg-muted/30 transition-colors">
                            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-sm font-medium mb-1">Arraste PDFs aqui</h3>
                            <p className="text-xs text-muted-foreground mb-4">ou clique para selecionar arquivos</p>
                            <Input 
                              type="file" 
                              accept="application/pdf" 
                              multiple 
                              className="hidden" 
                              id={`pdf-upload-${activeTab.id}`}
                              onChange={handlePdfUpload}
                            />
                            <Button variant="outline" size="sm" asChild>
                              <label htmlFor={`pdf-upload-${activeTab.id}`} className="cursor-pointer">
                                Selecionar Arquivos
                              </label>
                            </Button>
                          </div>
                          
                          {activeTab.pdfs.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Documentos Selecionados</h4>
                              <div className="space-y-2">
                                {activeTab.pdfs.map((pdf, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 bg-background border border-border rounded-md">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <FileText className="w-4 h-4 text-primary shrink-0" />
                                      <span className="text-sm truncate">{pdf.name}</span>
                                    </div>
                                    <button 
                                      onClick={() => updateActiveTab({ pdfs: activeTab.pdfs.filter((_, idx) => idx !== i) })}
                                      className="text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </div>
                    </ScrollArea>
                  </div>
                </Tabs>
              </div>

              {/* Right Panel: Output */}
              <div className="flex-1 flex flex-col bg-background min-w-0 relative">
                {/* Output header */}
                <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">Resultado da Análise</span>
                    {activeTab.status === 'running' && (() => {
                      const elapsedSec = activeTab.startedAt ? Math.floor((Date.now() - activeTab.startedAt) / 1000) : 0;
                      const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
                      const ss = String(elapsedSec % 60).padStart(2, '0');
                      const phase = activeTab.phase;
                      const tabQueued = activeTab.isQueued;
                      const tabQueuePos = activeTab.queuePosition;
                      return (
                        <div className="flex items-center gap-2">
                          {tabQueued ? (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                              </span>
                              <span className="text-xs text-amber-500 font-medium">
                                {tabQueuePos != null ? `Na fila (posição ${tabQueuePos})` : 'Na fila...'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                              </span>
                              <span className="text-xs text-primary font-mono font-medium">{mm}:{ss}</span>
                              <span className="text-xs text-muted-foreground">
                                {phase === 'extracting' ? '· Extraindo PDFs...' : '· Executando...'}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })()}
                    {activeTab.status === 'done' && activeTab.startedAt && activeTab.endedAt && (() => {
                      const totalSec = Math.floor((activeTab.endedAt - activeTab.startedAt) / 1000);
                      return (
                        <span className="text-xs text-muted-foreground">
                          ✓ Concluído em {Math.floor(totalSec / 60) > 0 ? `${Math.floor(totalSec / 60)}min ` : ''}{totalSec % 60}s
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {activeTab.status === 'running' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelTab(activeTab.id)}
                        className="h-8 gap-1.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        title="Cancelar análise em andamento"
                      >
                        <Square className="w-3 h-3 fill-current" /> Cancelar
                      </Button>
                    )}
                    {(activeTab.status === 'error' || activeTab.status === 'done') && activeTab.workflowKey && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestartTab(activeTab.id)}
                        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                        title="Reiniciar análise"
                      >
                        <RefreshCw className="w-3 h-3" /> Reiniciar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                      onClick={handleCopyResult}
                      disabled={!activeTab?.outputHtml}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                      onClick={handleExportPdf}
                      disabled={!activeTab?.outputHtml}
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </Button>
                    {activeTab?.status === 'done' && activeTab?.outputHtml && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveToKb}
                        disabled={activeTab.savingToKb || activeTab.savedToKb}
                        className={`h-8 gap-2 ${
                          activeTab.savedToKb
                            ? 'text-emerald-500 hover:text-emerald-500'
                            : 'text-muted-foreground hover:text-primary'
                        }`}
                        title={activeTab.savedToKb ? 'Já salvo na base de conhecimento' : 'Salvar parecer na base RAG para enriquecer análises futuras'}
                      >
                        {activeTab.savingToKb ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Indexando...</>
                        ) : activeTab.savedToKb ? (
                          <><CheckCheck className="w-3.5 h-3.5" /> Salvo na Base</>
                        ) : (
                          <><BookOpen className="w-3.5 h-3.5" /> Salvar na Base</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Slow analysis warning — appears after 5 minutes */}
                {activeTab.status === 'running' && activeTab.startedAt && (Date.now() - activeTab.startedAt) > 300_000 && (
                  <div className="mx-4 mt-2 flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-400 text-xs shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">Análise demorada detectada ({formatElapsed(activeTab)})</p>
                      <p className="text-amber-400/70">
                        {thinkMode === 'deep'
                          ? 'O Modo Profundo com documentos longos pode levar 5–15 min no deepseek-r1. Se preferir mais velocidade, cancele e use o Modo Rápido (⚡) ou configure Claude como provider.'
                          : 'A análise está demorando mais do esperado. Verifique se o Ollama está respondendo e considere cancelar e tentar novamente.'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Live indeterminate progress bar when running */}
                {activeTab.status === 'running' && (
                  <div className="h-0.5 w-full bg-border overflow-hidden shrink-0 relative">
                    <div
                      className="absolute h-full w-1/3 bg-primary"
                      style={{ animation: 'indeterminate-bar 1.8s ease-in-out infinite' }}
                    />
                  </div>
                )}
                
                <ScrollArea className="flex-1">
                  <div className="p-8 max-w-4xl mx-auto w-full">
                    {/* ── Activity Log (visible when running, before or during text) ── */}
                    {activeTab.status === 'running' && activeTab.execSteps.length > 0 && (
                      <div className={`mb-6 ${activeTab.outputHtml ? 'pb-4 border-b border-border/50' : 'py-8'}`}>
                        {/* Steps list */}
                        <div className={`space-y-1 ${activeTab.outputHtml ? 'max-w-full' : 'max-w-sm mx-auto'}`}>
                          {activeTab.execSteps.map((step, idx) => {
                            const isDone = idx < activeTab.execSteps.length - 1 || !!activeTab.outputHtml;
                            const isActive = idx === activeTab.execSteps.length - 1 && !activeTab.outputHtml;
                            return (
                              <div key={step.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                                isActive
                                  ? 'bg-primary/8 border border-primary/20 text-primary'
                                  : isDone
                                  ? 'text-muted-foreground'
                                  : 'text-muted-foreground/40'
                              }`}>
                                <span className={`shrink-0 ${isActive ? 'text-primary' : isDone ? 'text-emerald-500' : ''}`}>
                                  {isActive
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : isDone
                                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                                    : stepIcon(step.icon, 'w-3.5 h-3.5 opacity-30')}
                                </span>
                                <span className={`text-xs ${isActive ? 'font-medium' : ''} flex-1`}>{step.label}</span>
                                {isDone && (
                                  <span className="text-[10px] tabular-nums text-muted-foreground/50 shrink-0">
                                    {idx + 1 < activeTab.execSteps.length
                                      ? `${Math.floor((activeTab.execSteps[idx + 1].at - step.at) / 100) / 10}s`
                                      : ''}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {/* "Receiving" row — appears once text starts flowing */}
                          {activeTab.outputHtml && (
                            <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-primary/8 border border-primary/20 text-primary">
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              <span className="text-xs font-medium flex-1">Recebendo resposta do modelo...</span>
                            </div>
                          )}
                        </div>

                        {/* Skeleton placeholder — only before text arrives */}
                        {!activeTab.outputHtml && (
                          <div className="space-y-3 max-w-2xl mx-auto mt-8 opacity-10">
                            {[100, 82, 94, 68, 88, 55].map((w, i) => (
                              <div key={i} className="h-3 rounded bg-foreground animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Queue waiting state — job is in queue, no steps yet */}
                    {activeTab.status === 'running' && activeTab.isQueued && activeTab.execSteps.length === 0 && (
                      <div className="flex flex-col items-center gap-4 text-center py-16">
                        <div className="w-14 h-14 rounded-full border border-amber-500/30 flex items-center justify-center bg-amber-500/5 relative">
                          <Clock className="w-6 h-6 text-amber-500" />
                          <span className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {activeTab.queuePosition != null
                            ? `Na fila — posição ${activeTab.queuePosition}`
                            : 'Aguardando na fila...'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          A análise iniciará automaticamente quando for a vez do processo.
                        </p>
                      </div>
                    )}

                    {/* PDF extraction phase — no SSE steps yet */}
                    {activeTab.status === 'running' && activeTab.execSteps.length === 0 && activeTab.phase === 'extracting' && !activeTab.isQueued && (
                      <div className="flex flex-col items-center gap-4 text-center py-16">
                        <div className="w-14 h-14 rounded-full border border-primary/30 flex items-center justify-center bg-primary/5 relative">
                          <span className="font-serif italic text-2xl text-primary">ℓ</span>
                          <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Extraindo texto dos PDFs...</p>
                        <p className="text-xs text-muted-foreground">Processando {activeTab.pdfs.length} documento(s)</p>
                      </div>
                    )}

                    {/* Error state — prominent card */}
                    {activeTab.status === 'error' && activeTab.errorMessage && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-3">
                            <p className="font-semibold text-destructive text-sm">Análise não pôde ser concluída</p>
                            <pre className="text-sm text-destructive/80 whitespace-pre-wrap font-sans leading-relaxed">
                              {activeTab.errorMessage}
                            </pre>
                          </div>
                        </div>
                        {(activeTab.errorMessage.includes('offline') || activeTab.errorMessage.includes('ENOTFOUND') || activeTab.errorMessage.includes('Ollama')) && (
                          <div className="border-t border-destructive/20 pt-4 flex items-center gap-3">
                            <button
                              onClick={() => { checkLlm(); handleRestartTab(activeTab.id); }}
                              className="text-xs text-destructive underline hover:text-destructive/80"
                            >
                              Tentar novamente após reconexão
                            </button>
                            <span className="text-destructive/40 text-xs">•</span>
                            <button onClick={checkLlm} className="text-xs text-destructive/60 underline hover:text-destructive/80">
                              Verificar status da IA
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Streaming / done output text */}
                    {activeTab.outputHtml && (
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed text-[15px]"
                        dangerouslySetInnerHTML={{ __html: activeTab.outputHtml
                          .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/\n/g, '<br/>') }}
                      />
                    )}

                    {/* Done — no content */}
                    {activeTab.status === 'done' && !activeTab.outputHtml && (
                      <div className="py-8 text-center text-muted-foreground text-sm">Análise concluída sem conteúdo.</div>
                    )}

                    {/* Idle empty state */}
                    {activeTab.status !== 'running' && activeTab.status !== 'error' && !activeTab.outputHtml && activeTab.status !== 'done' && (
                      <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-32 space-y-4 opacity-50">
                        <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center bg-card">
                          <span className="font-serif italic text-2xl">ℓ</span>
                        </div>
                        <p className="text-sm font-sans">O resultado aparecerá aqui após a execução</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
              Crie um novo processo para iniciar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
