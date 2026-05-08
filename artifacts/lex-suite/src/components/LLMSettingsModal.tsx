import { useState, useEffect, useCallback } from "react";
import { X, Loader2, CheckCircle2, XCircle, Eye, EyeOff, Cpu, Cloud, Wifi, Database } from "lucide-react";
import { useAuth } from "@clerk/react";

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

interface LlmConfig {
  provider: "anthropic" | "ollama" | "none";
  anthropic: {
    configured: boolean;
    keyPreview: string | null;
    keySource: "database" | "env" | "none";
    model: string;
  };
  ollama: {
    configured: boolean;
    url: string | null;
    urlSource: "database" | "env" | "none";
    model: string;
  };
  dbBridge: {
    configured: boolean;
    url: string | null;
    urlSource: "database" | "env" | "none";
  };
}

const CLAUDE_MODELS = [
  { value: "claude-opus-4-5", label: "Claude Opus 4.5 (máxima qualidade)" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (equilibrado)" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (mais rápido)" },
  { value: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type PingResult = "ok" | "fail" | null;

export default function LLMSettingsModal({ open, onClose, onSaved }: Props) {
  const { getToken } = useAuth();
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-opus-4-5");
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [dbBridgeUrl, setDbBridgeUrl] = useState("");

  const [pingOllama, setPingOllama] = useState<PingResult>(null);
  const [pingOllamaLoading, setPingOllamaLoading] = useState(false);
  const [pingBridge, setPingBridge] = useState<PingResult>(null);
  const [pingBridgeLoading, setPingBridgeLoading] = useState(false);

  const authFetch = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const token = await getToken();
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, [getToken]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSaveMsg(null);
    setPingOllama(null);
    setPingBridge(null);
    setApiKey("");
    setOllamaUrl("");
    setDbBridgeUrl("");
    authFetch(`${apiBase}/api/admin/llm-config`)
      .then((r) => r.json())
      .then((data: LlmConfig) => {
        setConfig(data);
        setModel(data.anthropic.model ?? "claude-opus-4-5");
      })
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [open, authFetch]);

  if (!open) return null;

  const hasChanges =
    apiKey !== "" ||
    model !== config?.anthropic.model ||
    ollamaUrl !== "" ||
    dbBridgeUrl !== "";

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = {};
      if (apiKey !== "") body.anthropicApiKey = apiKey;
      if (model !== config?.anthropic.model) body.anthropicModel = model;
      if (ollamaUrl !== "") body.ollamaBaseUrl = ollamaUrl;
      if (dbBridgeUrl !== "") body.dbBridgeUrl = dbBridgeUrl;

      if (Object.keys(body).length === 0) {
        setSaveMsg({ type: "err", text: "Nenhuma alteração para salvar." });
        return;
      }

      const res = await authFetch(`${apiBase}/api/admin/llm-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string; keyPreview?: string; pingOk?: boolean; model?: string };
      if (!res.ok) {
        setSaveMsg({ type: "err", text: data.error ?? "Erro ao salvar." });
        return;
      }

      setSaveMsg({ type: "ok", text: "Configuração salva com sucesso. Teste a conexão abaixo." });
      setApiKey("");
      setOllamaUrl("");
      setDbBridgeUrl("");
      setPingOllama(null);
      setPingBridge(null);
      const refreshed = await authFetch(`${apiBase}/api/admin/llm-config`).then((r) => r.json()) as LlmConfig;
      setConfig(refreshed);
      onSaved();
    } catch {
      setSaveMsg({ type: "err", text: "Erro de rede ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  async function handlePingOllama() {
    setPingOllamaLoading(true);
    setPingOllama(null);
    try {
      const res = await authFetch(`${apiBase}/api/admin/ping-ollama`, { method: "POST" });
      const data = await res.json() as { online: boolean };
      setPingOllama(data.online ? "ok" : "fail");
    } catch {
      setPingOllama("fail");
    } finally {
      setPingOllamaLoading(false);
    }
  }

  async function handlePingBridge() {
    setPingBridgeLoading(true);
    setPingBridge(null);
    try {
      const res = await authFetch(`${apiBase}/api/admin/ping-db-bridge`, { method: "POST" });
      const data = await res.json() as { online: boolean; reason?: string };
      setPingBridge(data.online ? "ok" : "fail");
    } catch {
      setPingBridge("fail");
    } finally {
      setPingBridgeLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg mx-4 bg-background border border-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">Configurações de IA</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Motor de linguagem e conexões do Mini PC
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ── Ollama section ─────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Ollama — Mini PC local
                </p>

                {config?.ollama.configured && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        URL: <span className="font-mono text-foreground/70">{config.ollama.url}</span>
                        {config.ollama.urlSource === "database" && <span className="ml-2 text-emerald-500/80">(salvo no banco)</span>}
                        {config.ollama.urlSource === "env" && <span className="ml-2 text-muted-foreground/60">(env var)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Modelo: <span className="font-mono text-foreground/70">{config.ollama.model}</span>
                      </p>
                    </div>
                    <button
                      onClick={handlePingOllama}
                      disabled={pingOllamaLoading}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      {pingOllamaLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                      Testar
                    </button>
                  </div>
                )}

                {pingOllama && (
                  <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${pingOllama === "ok" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                    {pingOllama === "ok"
                      ? <><CheckCircle2 className="w-4 h-4 shrink-0" /> Ollama respondendo normalmente.</>
                      : <><XCircle className="w-4 h-4 shrink-0" /> Ollama inacessível — verifique o túnel.</>}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium block mb-1">Nova URL do túnel Ollama</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Cole a nova URL do Cloudflare (ex: <code className="font-mono">https://xxx.trycloudflare.com</code>). Salvo no banco — persiste entre reinicializações do servidor.
                  </p>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder={config?.ollama.url ? `Atual: ${config.ollama.url}` : "https://seu-tunel.trycloudflare.com"}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono placeholder:font-sans placeholder:text-muted-foreground/60"
                  />
                  {ollamaUrl && !ollamaUrl.startsWith("http") && (
                    <p className="text-xs text-destructive mt-1">A URL deve começar com http:// ou https://</p>
                  )}
                </div>
              </div>

              {/* ── DB Bridge section ──────────────────────────────── */}
              <div className="space-y-3 border-t border-border pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> DB Bridge — embeddings e RAG
                </p>

                {config?.dbBridge.configured && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        URL: <span className="font-mono text-foreground/70">{config.dbBridge.url}</span>
                        {config.dbBridge.urlSource === "database" && <span className="ml-2 text-emerald-500/80">(salvo no banco)</span>}
                        {config.dbBridge.urlSource === "env" && <span className="ml-2 text-muted-foreground/60">(env var)</span>}
                      </p>
                    </div>
                    <button
                      onClick={handlePingBridge}
                      disabled={pingBridgeLoading}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      {pingBridgeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                      Testar
                    </button>
                  </div>
                )}

                {pingBridge && (
                  <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${pingBridge === "ok" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                    {pingBridge === "ok"
                      ? <><CheckCircle2 className="w-4 h-4 shrink-0" /> DB Bridge respondendo — embeddings ativos.</>
                      : <><XCircle className="w-4 h-4 shrink-0" /> DB Bridge inacessível — base de conhecimento indisponível.</>}
                  </div>
                )}

                {!config?.dbBridge.configured && (
                  <p className="text-xs text-amber-500/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    DB Bridge não configurado. O Curador RAG e os embeddings ficam indisponíveis.
                  </p>
                )}

                <div>
                  <label className="text-sm font-medium block mb-1">Nova URL do túnel DB Bridge</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    URL do FastAPI local (ex: <code className="font-mono">https://yyy.trycloudflare.com</code>). Salvo no banco local — persiste entre reinicializações do servidor Replit.
                  </p>
                  <input
                    type="text"
                    value={dbBridgeUrl}
                    onChange={(e) => setDbBridgeUrl(e.target.value)}
                    placeholder={config?.dbBridge.url ? `Atual: ${config.dbBridge.url}` : "https://seu-db-bridge.trycloudflare.com"}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono placeholder:font-sans placeholder:text-muted-foreground/60"
                  />
                  {dbBridgeUrl && !dbBridgeUrl.startsWith("http") && (
                    <p className="text-xs text-destructive mt-1">A URL deve começar com http:// ou https://</p>
                  )}
                </div>
              </div>

              {/* ── Claude section ─────────────────────────────────── */}
              <div className="space-y-3 border-t border-border pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5" /> Claude (Anthropic) — fallback cloud
                </p>
                <div>
                  <label className="text-sm font-medium block mb-1">Chave da API</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Obtenha em <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">console.anthropic.com</a>. Salva no banco de dados, nunca exposta no navegador.
                  </p>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={config?.anthropic.keyPreview ? `Atual: ${config.anthropic.keyPreview} — cole para substituir` : "sk-ant-..."}
                      className="w-full pr-10 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring font-mono placeholder:font-sans placeholder:text-muted-foreground/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {apiKey && !apiKey.startsWith("sk-ant-") && (
                    <p className="text-xs text-destructive mt-1">A chave deve começar com sk-ant-</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium block mb-1">Modelo Claude</label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CLAUDE_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Save result */}
              {saveMsg && (
                <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${saveMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                  {saveMsg.type === "ok"
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                    : <XCircle className="w-4 h-4 shrink-0" />}
                  {saveMsg.text}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !hasChanges}
            className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
