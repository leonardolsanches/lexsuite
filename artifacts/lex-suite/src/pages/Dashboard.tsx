import { useGetMe, useGetSessionStats, getGetSessionStatsQueryKey } from '@workspace/api-client-react';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useClerk } from '@clerk/react';
import { Wheat, Scale, LayoutDashboard, LogOut, Calculator } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_PT: Record<string, string> = {
  idle: 'aguardando',
  running: 'executando',
  done: 'concluído',
  error: 'erro',
};

export default function Dashboard() {
  const { data: user, isLoading: userLoading } = useGetMe({ query: { queryKey: ['/api/me'] } });
  const { data: stats, isLoading: statsLoading } = useGetSessionStats({ query: { queryKey: getGetSessionStatsQueryKey() } });
  const { signOut } = useClerk();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-[60px] border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-background border border-border rounded flex items-center justify-center">
            <span className="font-serif italic font-semibold text-primary text-lg">ℓ</span>
          </div>
          <span className="font-serif font-semibold text-lg">Lex Suite</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => signOut()} data-testid="btn-signout" title="Sair">
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">
            Bem-vindo,{' '}
            {userLoading
              ? <Skeleton className="h-8 w-32 inline-block ml-2" />
              : <span>{user?.name || 'Doutor(a)'}</span>
            }
          </h1>
          <p className="text-muted-foreground font-sans">Selecione um módulo para iniciar a análise.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/app/rural" className="block outline-none" data-testid="link-module-rural">
            <Card className="bg-card border-border hover:border-[#c9a84c] transition-colors cursor-pointer group h-full flex flex-col">
              <div className="h-2 w-full bg-[#c9a84c] rounded-t-lg"></div>
              <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-[#c9a84c]/10 text-[#c9a84c] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wheat className="w-6 h-6" />
                  </div>
                  <CardTitle className="font-serif text-2xl group-hover:text-[#c9a84c] transition-colors">Lex Rural</CardTitle>
                </div>
                <CardContent className="p-0 text-muted-foreground font-sans text-sm">
                  Crédito rural, contratos agrícolas, Proagro e revisão de financiamentos. Fundamentação com base no MCR e jurisprudência do STJ/TRF.
                </CardContent>
              </div>
            </Card>
          </Link>

          <Link href="/app/executio" className="block outline-none" data-testid="link-module-executio">
            <Card className="bg-card border-border hover:border-[#4a7fc1] transition-colors cursor-pointer group h-full flex flex-col">
              <div className="h-2 w-full bg-[#4a7fc1] rounded-t-lg"></div>
              <div className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-[#4a7fc1]/10 text-[#4a7fc1] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Scale className="w-6 h-6" />
                  </div>
                  <CardTitle className="font-serif text-2xl group-hover:text-[#4a7fc1] transition-colors">Lex Executio</CardTitle>
                </div>
                <CardContent className="p-0 text-muted-foreground font-sans text-sm">
                  Execuções bancárias, embargos, cálculo de débito, impugnação à penhora e estratégia em hasta pública.
                </CardContent>
              </div>
            </Card>
          </Link>
        </div>

        {/* Utility tools row */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/app/calculadora" className="block outline-none">
            <Card className="bg-card border-border hover:border-emerald-500/50 transition-colors cursor-pointer group">
              <div className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors">Calculadora AWS</p>
                  <p className="text-xs text-muted-foreground">Estimativa de custo Bedrock por volume</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
            Atividade Recente
          </h2>

          {statsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : stats?.recentSessions && stats.recentSessions.length > 0 ? (
            <div className="bg-card border border-border rounded-lg divide-y divide-border">
              {stats.recentSessions.map((session) => (
                <div key={session.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <h3 className="font-medium text-foreground">{session.label || 'Sessão sem título'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {session.workflowKey} &bull; {new Date(session.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded border ${session.module === 'rural' ? 'border-[#c9a84c] text-[#c9a84c]' : 'border-[#4a7fc1] text-[#4a7fc1]'}`}>
                      {session.module === 'rural' ? 'Rural' : 'Executio'}
                    </span>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground">
                      {STATUS_PT[session.status] ?? session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-dashed border-border p-8 text-center text-muted-foreground">
              Nenhuma sessão recente. Selecione um módulo para iniciar sua primeira análise.
            </Card>
          )}

          {stats && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="text-2xl font-mono font-semibold text-foreground">{stats.totalSessions}</div>
                <div className="text-xs text-muted-foreground mt-1">Total de Análises</div>
              </div>
              <div className="bg-card border border-[#c9a84c]/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-mono font-semibold text-[#c9a84c]">{stats.sessionsByModule?.rural ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Lex Rural</div>
              </div>
              <div className="bg-card border border-[#4a7fc1]/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-mono font-semibold text-[#4a7fc1]">{stats.sessionsByModule?.executio ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Lex Executio</div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
