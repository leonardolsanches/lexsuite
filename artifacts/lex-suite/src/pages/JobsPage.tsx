import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Loader2, CheckCircle2, AlertCircle, Clock, Square,
  RefreshCw, Trash2, ChevronUp, Eye, Activity, XCircle,
  Wheat, Scale,
} from 'lucide-react';

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';

type Job = {
  id: string;
  workflowKey: string;
  module: string;
  thinkMode: 'fast' | 'deep';
  status: JobStatus;
  outputHtml?: string | null;
  errorMessage?: string | null;
  queuedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
};

type FilterKey = 'all' | 'active' | 'done' | 'error';

type JobsPageProps = { module: 'rural' | 'executio' };

function elapsed(start: string, end?: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export default function JobsPage({ module }: JobsPageProps) {
  const [, setLocation] = useLocation();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [, setTick] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const fetchJobs = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${apiBase}/api/jobs?limit=50&module=${module}`, { headers });
      if (!res.ok) return;
      const data = await res.json() as Job[];
      setJobs(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [authHeaders, module]);

  useEffect(() => {
    fetchJobs();
    const hasActive = () => jobs.some(j => j.status === 'running' || j.status === 'queued');
    const schedule = () => {
      clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        fetchJobs();
        setTick(n => n + 1);
        clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchJobs, hasActive() ? 4000 : 30000);
      }, hasActive() ? 4000 : 30000);
    };
    schedule();
    const tickId = setInterval(() => setTick(n => n + 1), 1000);
    return () => { clearInterval(pollRef.current); clearInterval(tickId); };
  }, [fetchJobs]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAction = (jobId: string, action: string) =>
    setActionLoading(prev => ({ ...prev, [jobId]: action }));
  const clearAction = (jobId: string) =>
    setActionLoading(prev => { const n = { ...prev }; delete n[jobId]; return n; });

  const handleView = (job: Job) => {
    setLocation(`/app/${module}?openJob=${job.id}`);
  };

  const handleRetry = async (job: Job) => {
    setAction(job.id, 'retry');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${apiBase}/api/jobs/${job.id}/retry`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erro');
      toast({ title: 'Job re-enfileirado', description: 'Análise será reexecutada em breve.' });
      fetchJobs();
    } catch (e: any) {
      toast({ title: 'Falha ao retentar', description: e.message, variant: 'destructive' });
    } finally { clearAction(job.id); }
  };

  const handlePrioritize = async (job: Job) => {
    setAction(job.id, 'prioritize');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${apiBase}/api/jobs/${job.id}/prioritize`, {
        method: 'PATCH',
        headers,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erro');
      toast({ title: 'Job priorizado', description: 'Será o próximo a executar.' });
      fetchJobs();
    } catch (e: any) {
      toast({ title: 'Falha ao priorizar', description: e.message, variant: 'destructive' });
    } finally { clearAction(job.id); }
  };

  const handleCancel = async (job: Job) => {
    setAction(job.id, 'cancel');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${apiBase}/api/jobs/${job.id}/cancel`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erro');
      toast({ title: 'Job cancelado' });
      fetchJobs();
    } catch (e: any) {
      toast({ title: 'Falha ao cancelar', description: e.message, variant: 'destructive' });
    } finally { clearAction(job.id); }
  };

  const handleDelete = async (job: Job) => {
    setAction(job.id, 'delete');
    try {
      const headers = await authHeaders();
      const res = await fetch(`${apiBase}/api/jobs/${job.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erro');
      setJobs(prev => prev.filter(j => j.id !== job.id));
      toast({ title: 'Job excluído' });
    } catch (e: any) {
      toast({ title: 'Falha ao excluir', description: e.message, variant: 'destructive' });
      clearAction(job.id);
    }
  };

  const filtered = jobs.filter(j => {
    if (filter === 'active') return j.status === 'running' || j.status === 'queued';
    if (filter === 'done') return j.status === 'done';
    if (filter === 'error') return j.status === 'error' || j.status === 'cancelled';
    return true;
  });

  const counts = {
    all: jobs.length,
    active: jobs.filter(j => j.status === 'running' || j.status === 'queued').length,
    done: jobs.filter(j => j.status === 'done').length,
    error: jobs.filter(j => j.status === 'error' || j.status === 'cancelled').length,
  };

  const primaryColor = module === 'rural' ? '#c9a84c' : '#4c8bc9';
  const ModuleIcon = module === 'rural' ? Wheat : Scale;

  const statusBadge = (job: Job) => {
    switch (job.status) {
      case 'running': return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          <Loader2 className="w-2.5 h-2.5 animate-spin" /> executando
        </span>
      );
      case 'queued': return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
          <Clock className="w-2.5 h-2.5" /> na fila
        </span>
      );
      case 'done': return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-2.5 h-2.5" /> concluído
        </span>
      );
      case 'error': return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-2.5 h-2.5" /> erro
        </span>
      );
      case 'cancelled': return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
          <XCircle className="w-2.5 h-2.5" /> cancelado
        </span>
      );
    }
  };

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col dark theme-${module}`}>
      {/* Header */}
      <header className="h-[60px] shrink-0 border-b border-border bg-card px-4 flex items-center gap-4 z-10">
        <Link href={`/app/${module}`} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="h-8 w-8 bg-background border border-border rounded flex items-center justify-center">
          <span className="font-serif italic font-semibold text-primary text-lg">ℓ</span>
        </div>
        <div className="flex items-center gap-2">
          <ModuleIcon className="w-4 h-4" style={{ color: primaryColor }} />
          <span className="font-serif font-semibold text-lg">
            Lex {module === 'rural' ? 'Rural' : 'Executio'}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Activity className="w-3.5 h-3.5" /> Fila de Análises
          </span>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={fetchJobs} className="gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3" /> Atualizar
        </Button>
      </header>

      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 gap-6">
        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-3">
          {([
            { label: 'Total', key: 'all', value: counts.all, color: 'text-foreground' },
            { label: 'Ativos', key: 'active', value: counts.active, color: 'text-primary' },
            { label: 'Concluídos', key: 'done', value: counts.done, color: 'text-emerald-500' },
            { label: 'Erros', key: 'error', value: counts.error, color: 'text-destructive' },
          ] as Array<{ label: string; key: FilterKey; value: number; color: string }>).map(stat => (
            <button
              key={stat.key}
              onClick={() => setFilter(stat.key)}
              className={`p-4 rounded-lg border transition-colors text-left ${
                filter === stat.key
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
              }`}
            >
              <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-1">
          {([
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Ativos' },
            { key: 'done', label: 'Concluídos' },
            { key: 'error', label: 'Erros / Cancelados' },
          ] as Array<{ key: FilterKey; label: string }>).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs rounded-t transition-colors ${
                filter === tab.key
                  ? 'bg-background border border-b-background border-border text-foreground font-medium -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 rounded-full">
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Jobs list */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando jobs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <Activity className="w-8 h-8 opacity-30" />
            <p className="text-sm">Nenhum job{filter !== 'all' ? ' nesta categoria' : ''}.</p>
            <Link href={`/app/${module}`}>
              <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                <ArrowLeft className="w-3 h-3" /> Ir para análises
              </Button>
            </Link>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-2 pb-4">
              {filtered.map(job => {
                const busy = actionLoading[job.id];
                const wfName = job.workflowKey;
                const jobElapsed = job.startedAt
                  ? elapsed(job.startedAt, job.finishedAt)
                  : null;
                const queuedTime = relTime(job.queuedAt);

                return (
                  <div
                    key={job.id}
                    className={`rounded-lg border bg-card p-4 flex gap-4 transition-colors ${
                      job.status === 'running'
                        ? 'border-primary/30 bg-primary/5'
                        : job.status === 'queued'
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : job.status === 'error'
                        ? 'border-destructive/20'
                        : job.status === 'cancelled'
                        ? 'border-border/50 opacity-60'
                        : 'border-border'
                    }`}
                  >
                    {/* Left: status indicator */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      {job.status === 'running' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                      {job.status === 'queued' && <Clock className="w-4 h-4 text-amber-500" />}
                      {job.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {job.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                      {job.status === 'cancelled' && <XCircle className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    {/* Center: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(job)}
                        <span className="text-sm font-medium text-foreground truncate">{wfName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                          {job.thinkMode === 'deep' ? '🧠 Profundo' : '⚡ Rápido'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-muted-foreground">
                        <span>Enviado {queuedTime}</span>
                        {jobElapsed && (
                          <span>
                            {job.status === 'running' ? '⏱ ' : job.status === 'done' ? '✓ ' : ''}
                            {jobElapsed}
                          </span>
                        )}
                        <span className="font-mono text-[10px] opacity-50 truncate max-w-[180px]">{job.id}</span>
                      </div>

                      {job.status === 'error' && job.errorMessage && (
                        <p className="mt-1.5 text-[11px] text-destructive/80 bg-destructive/5 border border-destructive/15 rounded px-2 py-1 leading-relaxed">
                          {job.errorMessage}
                        </p>
                      )}

                      {job.status === 'done' && job.outputHtml && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {job.outputHtml.replace(/<[^>]+>/g, ' ').slice(0, 180)}…
                        </p>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      {/* View result */}
                      {(job.status === 'done' || job.status === 'running') && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleView(job)}
                          className="h-7 px-2 gap-1 text-[11px]"
                          disabled={!!busy}
                        >
                          <Eye className="w-3 h-3" />
                          {job.status === 'running' ? 'Acompanhar' : 'Ver'}
                        </Button>
                      )}

                      {/* Prioritize */}
                      {job.status === 'queued' && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handlePrioritize(job)}
                          disabled={!!busy}
                          className="h-7 px-2 gap-1 text-[11px] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                          title="Mover para o início da fila"
                        >
                          {busy === 'prioritize'
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <ChevronUp className="w-3 h-3" />}
                          Priorizar
                        </Button>
                      )}

                      {/* Cancel */}
                      {(job.status === 'running' || job.status === 'queued') && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleCancel(job)}
                          disabled={!!busy}
                          className="h-7 px-2 gap-1 text-[11px] text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        >
                          {busy === 'cancel'
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Square className="w-3 h-3 fill-current" />}
                          Cancelar
                        </Button>
                      )}

                      {/* Retry */}
                      {(job.status === 'error' || job.status === 'cancelled' || job.status === 'done') && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleRetry(job)}
                          disabled={!!busy}
                          className="h-7 px-2 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          {busy === 'retry'
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RefreshCw className="w-3 h-3" />}
                          Retentar
                        </Button>
                      )}

                      {/* Delete */}
                      {job.status !== 'running' && (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDelete(job)}
                          disabled={!!busy}
                          className="h-7 px-2 gap-1 text-[11px] text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
                          title="Excluir permanentemente"
                        >
                          {busy === 'delete'
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </main>
    </div>
  );
}
