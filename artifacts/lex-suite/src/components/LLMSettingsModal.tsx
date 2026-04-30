import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, XCircle, Eye, EyeOff, Cpu, Cloud, Wifi } from "lucide-react";

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
    model: string;
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

export default function LLMSettingsModal({ open, onClose, onSaved }: Props) {
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-opus-4-5");
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSaveMsg(null);
    setTestResult(null);
    setApiKey("");
    fetch("/api/admin/llm-config")
      .then((r) => r.json())
      .then((data: LlmConfig) => {
        setConfig(data);
        setModel(data.anthropic.model ?? "claude-opus-4-5");
      })
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = {};
      if (apiKey !== "") body.anthropicApiKey = apiKey;
      if (model !== config?.anthropic.model) body.anthropicModel = model;

      if (Object.keys(body).length === 0) {
        setSaveMsg({ type: "err", text: "Nenhuma alteração para salvar." });
        return;
      }

      const res = await fetch("/api/admin/llm-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; error?: string; keyPreview?: string; pingOk?: boolean; model?: string };
      if (!res.ok) {
        setSaveMsg({ type: "err", text: data.error ?? "Erro ao salvar." });
        return;
      }

      setSaveMsg({
        type: "ok",
        text: data.pingOk === true
          ? "Configuração salva e conexão com Claude confirmada ✓"
          : data.pingOk === false
          ? "Configuração salva, mas o ping falhou — verifique a chave."
          : "Configuração salva com sucesso.",
      });

      setApiKey("");
      // Refresh config
      const refreshed = await fetch("/api/admin/llm-config").then((r) => r.json()) as LlmConfig;
      setConfig(refreshed);
      onSaved();
    } catch {
      setSaveMsg({ type: "err", text: "Erro de rede ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/llm-ping", { method: "POST" });
      const data = await res.json() as { online: boolean };
      setTestResult(data.online ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
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
              Motor de linguagem utilizado nas análises jurídicas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Active provider status */}
              {config && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-start gap-3">
                  {config.provider === "anthropic" ? (
                    <Cloud className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  ) : config.provider === "ollama" ? (
                    <Cpu className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Wifi className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {config.provider === "anthropic"
                        ? "Claude (Anthropic) — ativo"
                        : config.provider === "ollama"
                        ? "Ollama local — ativo"
                        : "Nenhum motor configurado"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {config.provider === "anthropic" && config.anthropic.keyPreview && (
                        <>Chave: <code className="font-mono">{config.anthropic.keyPreview}</code>
                        {config.anthropic.keySource === "env" && <span className="ml-1 text-muted-foreground/60">(variável de ambiente)</span>}
                        {config.anthropic.keySource === "database" && <span className="ml-1 text-emerald-500/80">(salva no banco)</span>}
                        </>
                      )}
                      {config.provider === "anthropic" && (
                        <> · Modelo: {config.anthropic.model}</>
                      )}
                      {config.provider === "ollama" && (
                        <>Modelo: {config.ollama.model}</>
                      )}
                      {config.provider === "none" && (
                        "Configure a chave do Claude abaixo para ativar."
                      )}
                    </p>
                  </div>
                  {/* Test button */}
                  <button
                    onClick={handleTest}
                    disabled={testing || config.provider === "none"}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                    Testar
                  </button>
                </div>
              )}

              {/* Test result */}
              {testResult && (
                <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${testResult === "ok" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                  {testResult === "ok"
                    ? <><CheckCircle2 className="w-4 h-4 shrink-0" /> Conexão com o motor de IA confirmada.</>
                    : <><XCircle className="w-4 h-4 shrink-0" /> Ping falhou — verifique a chave ou a conexão.</>
                  }
                </div>
              )}

              {/* Claude API key section */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Chave da API — Claude (Anthropic)
                  </label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Obtenha em <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">console.anthropic.com</a>. A chave é salva com segurança no banco de dados do sistema e nunca fica exposta no navegador.
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

              {/* Ollama info (read-only) */}
              {config?.ollama.configured && (
                <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Fallback local (Ollama)</p>
                  <p className="text-xs text-muted-foreground">
                    Modelo: <span className="font-mono text-foreground/80">{config.ollama.model}</span>
                    {" · "}Ativado quando o Claude não está configurado.
                  </p>
                </div>
              )}

              {/* Save result message */}
              {saveMsg && (
                <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${saveMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                  {saveMsg.type === "ok"
                    ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                    : <XCircle className="w-4 h-4 shrink-0" />
                  }
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
            disabled={saving || loading || (!apiKey && model === config?.anthropic.model)}
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
