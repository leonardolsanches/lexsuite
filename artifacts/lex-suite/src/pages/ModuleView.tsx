import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  useListWorkflows, 
  getListWorkflowsQueryKey,
  useCreateSession,
  useListSessions,
  getListSessionsQueryKey,
  useDeleteSession
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUser, useClerk } from '@clerk/react';
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
  Database
} from 'lucide-react';
import { useStreaming } from '@/hooks/use-streaming';
import { usePdf } from '@/hooks/use-pdf';

type ModuleViewProps = {
  module: 'rural' | 'executio';
};

type ProcessTab = {
  id: string;
  sessionId?: number;
  workflowKey: string | null;
  label: string;
  status: 'idle' | 'running' | 'done' | 'error';
  phase?: 'extracting' | 'streaming';
  startedAt?: number;
  endedAt?: number;
  mode: 'form' | 'paste' | 'pdf';
  formData: Record<string, any>;
  pasteText: string;
  outputHtml: string;
  pdfs: File[];
};

export default function ModuleView({ module }: ModuleViewProps) {
  const [location, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabs, setTabs] = useState<ProcessTab[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  
  const { data: workflows = [] } = useListWorkflows({ 
    query: { queryKey: getListWorkflowsQueryKey() } 
  });
  
  const moduleWorkflows = workflows.filter(w => w.module === module).sort((a, b) => a.sortOrder - b.sortOrder);
  
  const createSession = useCreateSession();
  
  const { isStreaming, startStream } = useStreaming();
  const { isLoaded: pdfLoaded, extractText } = usePdf();

  // Keep a ref to always-fresh tabs for use inside async callbacks
  const tabsRef = useRef<ProcessTab[]>([]);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);

  // Tick every second while any tab is running (drives the live elapsed timer)
  const [, setTick] = useState(0);
  const anyRunning = tabs.some(t => t.status === 'running');
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [anyRunning]);

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

    updateTab(tabId, { status: 'running', outputHtml: '', startedAt: Date.now(), phase: 'extracting' });

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
      formData: tab.mode === 'form' ? payloadFormData : undefined,
      pasteText: tab.mode === 'paste'
        ? tab.pasteText
        : (tab.mode === 'pdf' || pdfExtractedText ? pdfExtractedText : undefined),
    };

    try {
      // Try to create/reuse session — fail silently if DB Bridge is unavailable
      let sessionId = tab.sessionId;
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
          updateTab(tabId, { status: 'done', outputHtml: fullContent, endedAt: Date.now() });
        },
        // onChunk — live streaming to the correct tab, directly by tabId
        (partial) => {
          updateTab(tabId, { outputHtml: partial, phase: 'streaming' });
        }
      );

    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('não configurad') || msg.includes('not configured')) {
        toast({ title: 'IA não configurada', description: 'Configure o motor de IA nas preferências do sistema.', variant: 'destructive' });
      } else {
        toast({ title: 'Erro na análise', description: msg || 'Tente novamente.', variant: 'destructive' });
      }
      updateTab(tabId, { status: 'error' });
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
    setIsRunningAll(true);
    for (const tab of withWorkflow) {
      setActiveTabId(tab.id);
      // Give React a tick to re-render before starting the next stream
      await new Promise(r => setTimeout(r, 100));
      await handleRunAnalysisForTab(tab.id);
    }
    setIsRunningAll(false);
    toast({ title: `${withWorkflow.length} processo(s) concluído(s)!`, description: 'Todas as análises foram finalizadas.' });
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
          <Link href={`/app/${module}/documents`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
              <Database className="w-4 h-4" />
              Base de Docs
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sair">
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </header>

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
                className={`group flex items-center gap-2 h-9 px-3 min-w-[140px] max-w-[200px] border-r border-l border-t rounded-t-md mx-0.5 cursor-pointer transition-colors ${
                  activeTabId === tab.id 
                    ? 'bg-background border-border text-foreground' 
                    : 'bg-card border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className="text-xs font-mono opacity-50">P{idx + 1}</span>
                <span className="text-sm truncate flex-1">{tab.label}</span>
                
                {tab.status === 'running' && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
                
                <button 
                  onClick={(e) => closeTab(e, tab.id)}
                  className="w-4 h-4 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNewProcess}
              className="ml-2 text-muted-foreground h-8 px-2"
            >
              <Plus className="w-4 h-4 mr-1" /> Novo
            </Button>
            <div className="flex-1"></div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunAll}
              disabled={isStreaming || isRunningAll || tabs.filter(t => t.workflowKey).length === 0}
              className="h-8 gap-2 ml-2 border-primary/40 text-primary hover:bg-primary/10"
              data-testid="btn-executar-todos"
              title="Executa todos os processos de P1 a Pn em sequência"
            >
              {isRunningAll ? (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              ) : (
                <Play className="w-3 h-3 fill-primary" />
              )}
              Executar Todos
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={handleRunAnalysis}
              disabled={!activeTab?.workflowKey || activeTab?.status === 'running' || isRunningAll}
              className="h-8 gap-2 ml-2"
              data-testid="btn-executar"
            >
              <Play className="w-3 h-3" />
              Executar
            </Button>
          </div>

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
                      return (
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                          </span>
                          <span className="text-xs text-primary font-mono font-medium">{mm}:{ss}</span>
                          <span className="text-xs text-muted-foreground">
                            {phase === 'extracting' ? '· Extraindo PDFs...' : '· Gerando análise...'}
                          </span>
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
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </Button>
                  </div>
                </div>

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
                    {activeTab.outputHtml ? (
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed text-[15px]"
                        dangerouslySetInnerHTML={{ __html: activeTab.outputHtml.replace(/\n/g, '<br/>') }}
                      />
                    ) : activeTab.status === 'running' ? (
                      <div className="space-y-6 py-12">
                        {/* Phase indicator */}
                        <div className="flex flex-col items-center gap-4 text-center">
                          <div className="w-14 h-14 rounded-full border border-primary/30 flex items-center justify-center bg-primary/5 relative">
                            <span className="font-serif italic text-2xl text-primary">ℓ</span>
                            <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {activeTab.phase === 'extracting' ? 'Extraindo texto dos PDFs...' : 'Aguardando resposta da IA...'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activeTab.phase === 'extracting'
                                ? 'Processando ' + (activeTab.pdfs.length) + ' documento(s)'
                                : 'O modelo está gerando a análise jurídica'}
                            </p>
                          </div>
                        </div>
                        {/* Skeleton lines */}
                        <div className="space-y-3 max-w-2xl mx-auto opacity-20">
                          {[100, 85, 92, 70, 88, 60].map((w, i) => (
                            <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    ) : (
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
