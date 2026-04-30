import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, TrendingUp, Zap, DollarSign, Calculator } from 'lucide-react';

// ── Pricing (USD per million tokens, on-demand) ────────────────────────────
const MODELS = {
  haiku: { label: 'Claude 3.5 Haiku', color: '#60a5fa', inPMT: 1.0, outPMT: 5.0 },
  sonnet: { label: 'Claude 3.5 Sonnet', color: '#a78bfa', inPMT: 3.0, outPMT: 15.0 },
  opus: { label: 'Claude 3 Opus', color: '#f59e0b', inPMT: 15.0, outPMT: 75.0 },
} as const;
type ModelKey = keyof typeof MODELS;

// Tokens per page (avg for Portuguese legal documents)
const TOKENS_PER_PAGE = 500;
const BASE_OVERHEAD = 1000; // system prompt + metadata + form
const RAG_TOKENS = 2500;

// Workflow definitions
const WORKFLOWS = [
  { key: 'verificacao', label: 'Verificação de Prazo', pages: 4, outTokens: 1000, color: '#34d399' },
  { key: 'preauditoria', label: 'Pré-Auditoria', pages: 12, outTokens: 2500, color: '#60a5fa' },
  { key: 'fases', label: 'Fases Processuais', pages: 20, outTokens: 3000, color: '#a78bfa' },
  { key: 'embargos', label: 'Embargos à Execução', pages: 28, outTokens: 4500, color: '#f87171' },
];

// Infrastructure alternatives (USD/month fixed)
const INFRA = {
  minipc: { label: 'Mini PC (local)', usdPerMonth: 0, brlFixed: 80 },
  ec2_g5xl: { label: 'EC2 g5.xlarge (24/7)', usdPerMonth: 730, brlFixed: 0 },
  ec2_g5_12xl: { label: 'EC2 g5.12xlarge (24/7)', usdPerMonth: 4082, brlFixed: 0 },
};

function calcCostUSD(
  totalAnalyses: number,
  distribution: number[], // 4 values summing to 100
  customPages: number[],
  model: ModelKey,
  ragEnabled: boolean,
  batchDiscount: boolean
): { totalUSD: number; perAnalysisUSD: number; avgInputTokens: number; avgOutputTokens: number } {
  const { inPMT, outPMT } = MODELS[model];
  const discount = batchDiscount ? 0.5 : 1.0;

  let weightedInTokens = 0;
  let weightedOutTokens = 0;
  const totalWeight = distribution.reduce((a, b) => a + b, 0) || 100;

  for (let i = 0; i < WORKFLOWS.length; i++) {
    const weight = distribution[i] / totalWeight;
    const pages = customPages[i] ?? WORKFLOWS[i].pages;
    const inTokens = BASE_OVERHEAD + pages * TOKENS_PER_PAGE + (ragEnabled ? RAG_TOKENS : 0);
    const outTokens = WORKFLOWS[i].outTokens;
    weightedInTokens += weight * inTokens;
    weightedOutTokens += weight * outTokens;
  }

  const costPerAnalysis = (weightedInTokens / 1_000_000) * inPMT * discount
    + (weightedOutTokens / 1_000_000) * outPMT * discount;

  return {
    totalUSD: costPerAnalysis * totalAnalyses,
    perAnalysisUSD: costPerAnalysis,
    avgInputTokens: Math.round(weightedInTokens),
    avgOutputTokens: Math.round(weightedOutTokens),
  };
}

function fmt(val: number, currency: 'USD' | 'BRL', decimals = 2) {
  if (currency === 'BRL') {
    return `R$ ${(val).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
  return `US$ ${val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function Slider({
  label, value, min, max, step = 1, onChange, unit = '', hint
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; unit?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-sm font-mono font-medium text-foreground tabular-nums">
          {value.toLocaleString('pt-BR')}{unit}
        </span>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full accent-primary cursor-pointer bg-border"
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all w-full text-left ${
        checked
          ? 'border-primary/50 bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-border/80'
      }`}
    >
      <span className={`w-7 h-4 rounded-full relative transition-colors ${checked ? 'bg-primary' : 'bg-border'}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${checked ? 'left-3.5' : 'left-0.5'}`} />
      </span>
      {label}
    </button>
  );
}

const CustomTooltip = ({ active, payload, label, brl, exRate }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {brl ? fmt(p.value * exRate, 'BRL') : fmt(p.value, 'USD')}
        </p>
      ))}
    </div>
  );
};

export default function Calculadora() {
  const [analyses, setAnalyses] = useState(200);
  const [distribution, setDistribution] = useState([10, 40, 30, 20]);
  const [customPages, setCustomPages] = useState(WORKFLOWS.map(w => w.pages));
  const [model, setModel] = useState<ModelKey>('sonnet');
  const [ragEnabled, setRagEnabled] = useState(false);
  const [batchDiscount, setBatchDiscount] = useState(false);
  const [exRate, setExRate] = useState(5.70);
  const [showBRL, setShowBRL] = useState(true);

  // Normalize distribution to sum = 100
  const totalDist = distribution.reduce((a, b) => a + b, 0);
  const normDist = totalDist > 0 ? distribution.map(d => (d / totalDist) * 100) : distribution;

  const results = useMemo(() => {
    const r: Record<ModelKey, ReturnType<typeof calcCostUSD>> = {} as any;
    for (const mk of Object.keys(MODELS) as ModelKey[]) {
      r[mk] = calcCostUSD(analyses, normDist, customPages, mk, ragEnabled, batchDiscount);
    }
    return r;
  }, [analyses, normDist, customPages, ragEnabled, batchDiscount]);

  const selected = results[model];

  // Bar chart data: model comparison for current volume
  const barData = Object.entries(MODELS).map(([mk, m]) => ({
    name: m.label.replace('Claude 3.5 ', '').replace('Claude 3 ', ''),
    USD: results[mk as ModelKey].totalUSD,
    color: m.color,
  }));

  // Line chart: cost vs volume for all three models + EC2 break-even
  const breakEvenData = useMemo(() => {
    const points = [10, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000];
    return points.map(n => {
      const row: Record<string, number | string> = { analyses: n };
      for (const mk of Object.keys(MODELS) as ModelKey[]) {
        const r = calcCostUSD(n, normDist, customPages, mk, ragEnabled, batchDiscount);
        row[mk] = parseFloat((r.totalUSD * exRate).toFixed(2));
      }
      row['minipc'] = 80; // fixed BRL
      row['ec2_g5xl'] = parseFloat((infra_usd_to_brl(730, exRate)).toFixed(2));
      row['ec2_g5_12xl'] = parseFloat((infra_usd_to_brl(4082, exRate)).toFixed(2));
      return row;
    });
  }, [normDist, customPages, ragEnabled, batchDiscount, exRate]);

  function infra_usd_to_brl(usd: number, rate: number) { return usd * rate; }

  // Find break-even point for selected model vs EC2 g5.xlarge
  const breakEvenAnalyses = useMemo(() => {
    const ec2Monthly = 730 * exRate;
    if (selected.perAnalysisUSD * exRate === 0) return null;
    return Math.ceil(ec2Monthly / (selected.perAnalysisUSD * exRate));
  }, [selected, exRate]);

  const monthlyBRL = selected.totalUSD * exRate;
  const annualBRL = monthlyBRL * 12;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/app">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Calculator className="h-4 w-4 text-primary" />
          <span className="font-serif font-semibold">Calculadora AWS Bedrock</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBRL(!showBRL)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
              showBRL ? 'border-primary text-primary' : 'border-border text-muted-foreground'
            }`}
          >
            {showBRL ? 'R$ BRL' : 'US$ USD'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Inputs ── */}
        <aside className="w-80 border-r border-border bg-card overflow-y-auto flex-shrink-0 p-5 space-y-6">
          {/* Volume */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Volume Mensal</h3>
            <Slider
              label="Análises por mês"
              value={analyses}
              min={10} max={5000} step={10}
              onChange={setAnalyses}
              hint="1 análise = 1 execução de workflow completo"
            />
          </section>

          {/* Workflow distribution */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mix de Workflows</h3>
            <p className="text-[10px] text-muted-foreground/60">Proporção relativa (normalizada automaticamente)</p>
            {WORKFLOWS.map((wf, i) => (
              <div key={wf.key} className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs text-muted-foreground">{wf.label}</label>
                  <span className="text-xs font-mono text-foreground">{Math.round(normDist[i])}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5} value={distribution[i]}
                  onChange={e => {
                    const next = [...distribution];
                    next[i] = Number(e.target.value);
                    setDistribution(next);
                  }}
                  className="w-full h-1.5 rounded-full cursor-pointer bg-border"
                  style={{ accentColor: wf.color }}
                />
              </div>
            ))}
          </section>

          {/* Pages per workflow */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Páginas Médias por Workflow</h3>
            {WORKFLOWS.map((wf, i) => (
              <Slider
                key={wf.key}
                label={wf.label}
                value={customPages[i]}
                min={1} max={100}
                onChange={v => {
                  const next = [...customPages];
                  next[i] = v;
                  setCustomPages(next);
                }}
                unit=" págs"
              />
            ))}
          </section>

          {/* Model */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modelo Claude</h3>
            {(Object.entries(MODELS) as [ModelKey, typeof MODELS[ModelKey]][]).map(([mk, m]) => (
              <button
                key={mk}
                onClick={() => setModel(mk)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all ${
                  model === mk
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-border/80'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                  {m.label}
                </span>
                <span className="font-mono text-[10px] opacity-70">
                  ${m.inPMT}/${ m.outPMT}/MTok
                </span>
              </button>
            ))}
          </section>

          {/* Options */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opções</h3>
            <Toggle label="RAG ativo (+2.500 tokens/análise)" checked={ragEnabled} onChange={setRagEnabled} />
            <Toggle label="Batch Inference (−50% custo)" checked={batchDiscount} onChange={setBatchDiscount} />
          </section>

          {/* Exchange rate */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Câmbio USD → BRL</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">R$</span>
              <input
                type="number" step="0.01" min="1" max="20"
                value={exRate}
                onChange={e => setExRate(Number(e.target.value))}
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm font-mono text-center focus:outline-none focus:border-primary"
              />
              <span className="text-xs text-muted-foreground">/ US$</span>
            </div>
          </section>
        </aside>

        {/* ── Right Panel: Results ── */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Por análise</p>
                <p className="text-2xl font-mono font-bold text-foreground">
                  {showBRL ? fmt(selected.perAnalysisUSD * exRate, 'BRL') : fmt(selected.perAnalysisUSD, 'USD')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{MODELS[model].label}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Mensal ({analyses.toLocaleString('pt-BR')} análises)</p>
                <p className="text-2xl font-mono font-bold text-primary">
                  {showBRL ? fmt(monthlyBRL, 'BRL') : fmt(selected.totalUSD, 'USD')}
                </p>
                {batchDiscount && <p className="text-[10px] text-emerald-500 mt-1">50% desconto batch aplicado</p>}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Anual projetado</p>
                <p className="text-2xl font-mono font-bold text-foreground">
                  {showBRL ? fmt(annualBRL, 'BRL') : fmt(selected.totalUSD * 12, 'USD')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">sem correção cambial</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Tokens/análise (média)</p>
                <p className="text-lg font-mono font-bold text-foreground">
                  {(selected.avgInputTokens + selected.avgOutputTokens).toLocaleString('pt-BR')}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {selected.avgInputTokens.toLocaleString('pt-BR')} entrada · {selected.avgOutputTokens.toLocaleString('pt-BR')} saída
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Break-even alert */}
          {breakEvenAnalyses && (
            <div className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${
              analyses < breakEvenAnalyses
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/5 text-amber-400'
            }`}>
              <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                {analyses < breakEvenAnalyses ? (
                  <p>
                    Com <strong>{analyses.toLocaleString('pt-BR')} análises/mês</strong>, o Bedrock ({MODELS[model].label}) é
                    {' '}<strong>mais econômico</strong> que uma EC2 g5.xlarge dedicada.
                    O break-even acontece em <strong>{breakEvenAnalyses.toLocaleString('pt-BR')} análises/mês</strong>.
                  </p>
                ) : (
                  <p>
                    Com <strong>{analyses.toLocaleString('pt-BR')} análises/mês</strong>, você ultrapassou o break-even de
                    {' '}<strong>{breakEvenAnalyses.toLocaleString('pt-BR')} análises/mês</strong>.
                    Uma EC2 g5.xlarge dedicada pode ser mais econômica a partir desse volume.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Bar chart: model comparison */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Comparativo de Modelos — {analyses.toLocaleString('pt-BR')} análises/mês
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={v => showBRL ? `R$${(v * exRate).toFixed(0)}` : `$${v.toFixed(0)}`}
                    />
                    <Tooltip
                      content={<CustomTooltip brl={showBRL} exRate={exRate} />}
                    />
                    <Bar dataKey="USD" name="Custo mensal" radius={[4, 4, 0, 0]}>
                      {barData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-3 space-y-2">
                  {(Object.entries(MODELS) as [ModelKey, typeof MODELS[ModelKey]][]).map(([mk, m], i) => {
                    const val = showBRL ? results[mk].totalUSD * exRate : results[mk].totalUSD;
                    const max = Math.max(...(Object.keys(MODELS) as ModelKey[]).map(k => showBRL ? results[k].totalUSD * exRate : results[k].totalUSD));
                    return (
                      <div key={mk} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{m.label}</span>
                          <span className="font-mono text-foreground">{showBRL ? fmt(val, 'BRL') : fmt(results[mk].totalUSD, 'USD')}</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${max > 0 ? (val / max) * 100 : 0}%`, backgroundColor: m.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Line chart: break-even */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Break-Even: Bedrock vs. Infraestrutura Dedicada
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={breakEvenData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="analyses" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      label={{ value: 'análises/mês', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={v => `R$${v > 999 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <Tooltip formatter={(v: number) => fmt(v, 'BRL')} labelFormatter={v => `${v} análises/mês`}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine x={analyses} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: 'agora', fontSize: 10, fill: 'hsl(var(--primary))' }} />
                    <Line type="monotone" dataKey="haiku" name="Haiku" stroke="#60a5fa" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="sonnet" name="Sonnet" stroke="#a78bfa" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="opus" name="Opus" stroke="#f59e0b" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="minipc" name="Mini PC" stroke="#6b7280" dot={false} strokeWidth={1.5} strokeDasharray="6 3" />
                    <Line type="monotone" dataKey="ec2_g5xl" name="EC2 g5.xlarge" stroke="#f87171" dot={false} strokeWidth={1.5} strokeDasharray="6 3" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  EC2 g5.xlarge: US$1,01/h × 730h = US$730/mês fixo, independente do volume.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed table by workflow */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-4">Custo Detalhado por Workflow — Modelo: {MODELS[model].label}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left pb-2 font-medium">Workflow</th>
                      <th className="text-right pb-2 font-medium">Páginas</th>
                      <th className="text-right pb-2 font-medium">Tokens entrada</th>
                      <th className="text-right pb-2 font-medium">Tokens saída</th>
                      <th className="text-right pb-2 font-medium">Custo/análise</th>
                      <th className="text-right pb-2 font-medium">Mix</th>
                      <th className="text-right pb-2 font-medium">Análises/mês</th>
                      <th className="text-right pb-2 font-medium">Custo/mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {WORKFLOWS.map((wf, i) => {
                      const pages = customPages[i];
                      const inTok = BASE_OVERHEAD + pages * TOKENS_PER_PAGE + (ragEnabled ? RAG_TOKENS : 0);
                      const outTok = wf.outTokens;
                      const { inPMT, outPMT } = MODELS[model];
                      const disc = batchDiscount ? 0.5 : 1.0;
                      const costPerAnalysis = ((inTok / 1e6) * inPMT + (outTok / 1e6) * outPMT) * disc;
                      const wfAnalyses = Math.round((normDist[i] / 100) * analyses);
                      const wfCost = costPerAnalysis * wfAnalyses;

                      return (
                        <tr key={wf.key} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: wf.color }} />
                              {wf.label}
                            </span>
                          </td>
                          <td className="text-right py-2.5 font-mono">{pages}</td>
                          <td className="text-right py-2.5 font-mono text-muted-foreground">
                            {inTok.toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right py-2.5 font-mono text-muted-foreground">
                            {outTok.toLocaleString('pt-BR')}
                          </td>
                          <td className="text-right py-2.5 font-mono">
                            {showBRL ? fmt(costPerAnalysis * exRate, 'BRL', 3) : fmt(costPerAnalysis, 'USD', 4)}
                          </td>
                          <td className="text-right py-2.5">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${normDist[i]}%`, backgroundColor: wf.color }} />
                              </div>
                              {Math.round(normDist[i])}%
                            </div>
                          </td>
                          <td className="text-right py-2.5 font-mono">{wfAnalyses.toLocaleString('pt-BR')}</td>
                          <td className="text-right py-2.5 font-mono font-medium">
                            {showBRL ? fmt(wfCost * exRate, 'BRL') : fmt(wfCost, 'USD')}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-border font-semibold">
                      <td className="pt-2.5 text-foreground" colSpan={6}>Total mensal</td>
                      <td className="text-right pt-2.5 font-mono">{analyses.toLocaleString('pt-BR')}</td>
                      <td className="text-right pt-2.5 font-mono text-primary">
                        {showBRL ? fmt(monthlyBRL, 'BRL') : fmt(selected.totalUSD, 'USD')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Infrastructure comparison table */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-4">Comparativo de Infraestrutura — {analyses.toLocaleString('pt-BR')} análises/mês</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left pb-2 font-medium">Infraestrutura</th>
                      <th className="text-right pb-2 font-medium">Custo fixo/mês</th>
                      <th className="text-right pb-2 font-medium">Custo variável</th>
                      <th className="text-right pb-2 font-medium">Total/mês</th>
                      <th className="text-right pb-2 font-medium">Total/ano</th>
                      <th className="text-right pb-2 font-medium">Contexto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {[
                      { label: 'Mini PC local', fixedBRL: 80, varBRL: 0, ctx: '16k tokens', highlight: false },
                      { label: `Bedrock Haiku`, fixedBRL: 0, varBRL: results.haiku.totalUSD * exRate, ctx: '200k tokens', highlight: false },
                      { label: `Bedrock Sonnet`, fixedBRL: 0, varBRL: results.sonnet.totalUSD * exRate, ctx: '200k tokens', highlight: model === 'sonnet' },
                      { label: `Bedrock Opus`, fixedBRL: 0, varBRL: results.opus.totalUSD * exRate, ctx: '200k tokens', highlight: model === 'opus' },
                      { label: 'EC2 g5.xlarge (24/7)', fixedBRL: 730 * exRate, varBRL: 0, ctx: '~16k tokens', highlight: false },
                      { label: 'EC2 g5.12xlarge (24/7)', fixedBRL: 4082 * exRate, varBRL: 0, ctx: '~64k tokens', highlight: false },
                    ].map((row, i) => {
                      const total = row.fixedBRL + row.varBRL;
                      return (
                        <tr key={i} className={`transition-colors ${row.highlight ? 'bg-primary/5' : 'hover:bg-muted/20'}`}>
                          <td className="py-2.5">
                            <span className="flex items-center gap-2">
                              {row.highlight && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                              {row.label}
                              {row.highlight && <span className="text-[10px] text-primary border border-primary/30 rounded px-1">selecionado</span>}
                            </span>
                          </td>
                          <td className="text-right py-2.5 font-mono text-muted-foreground">
                            {row.fixedBRL > 0 ? fmt(row.fixedBRL, 'BRL') : '—'}
                          </td>
                          <td className="text-right py-2.5 font-mono text-muted-foreground">
                            {row.varBRL > 0 ? fmt(row.varBRL, 'BRL') : '—'}
                          </td>
                          <td className="text-right py-2.5 font-mono font-medium">{fmt(total, 'BRL')}</td>
                          <td className="text-right py-2.5 font-mono text-muted-foreground">{fmt(total * 12, 'BRL')}</td>
                          <td className="text-right py-2.5 text-muted-foreground">{row.ctx}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
                <Info className="w-3 h-3 shrink-0" />
                EC2: custo sob demanda us-east-1, sem instâncias reservadas. Bedrock: preço on-demand sem Provisioned Throughput. Câmbio: R$ {exRate.toFixed(2)}/US$.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
