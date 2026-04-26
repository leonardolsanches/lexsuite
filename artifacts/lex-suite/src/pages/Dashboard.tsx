import { useGetMe, useGetSessionStats, getGetSessionStatsQueryKey } from '@workspace/api-client-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { UserButton, useClerk } from '@clerk/react';
import { Wheat, Scale, LayoutDashboard, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
          <Button variant="ghost" size="icon" onClick={() => signOut()} data-testid="btn-signout" title="Sign Out">
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">
            Welcome back, {userLoading ? <Skeleton className="h-8 w-32 inline-block ml-2" /> : user?.name || 'Counsel'}
          </h1>
          <p className="text-muted-foreground font-sans">Select a module to begin analysis.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/app/rural" className="block outline-none" data-testid="link-module-rural">
            <Card className="bg-card border-border hover:border-[#c9a84c] transition-colors cursor-pointer group h-full flex flex-col">
              <div className="h-2 w-full bg-[#c9a84c] rounded-t-lg"></div>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-[#c9a84c]/10 text-[#c9a84c] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wheat className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-2xl group-hover:text-[#c9a84c] transition-colors">Lex Rural</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 text-muted-foreground font-sans">
                Legal AI assistant for rural credit cases. Process CCB, CPR, and agricultural contracts.
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/executio" className="block outline-none" data-testid="link-module-executio">
            <Card className="bg-card border-border hover:border-[#4a7fc1] transition-colors cursor-pointer group h-full flex flex-col">
              <div className="h-2 w-full bg-[#4a7fc1] rounded-t-lg"></div>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-[#4a7fc1]/10 text-[#4a7fc1] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-2xl group-hover:text-[#4a7fc1] transition-colors">Lex Executio</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 text-muted-foreground font-sans">
                Legal AI assistant for court enforcement cases. Analyze procedural phases and manifestations.
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-serif font-semibold flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
            Recent Activity
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
                    <h3 className="font-medium text-foreground">{session.label || 'Untitled Session'}</h3>
                    <p className="text-sm text-muted-foreground">{session.workflowKey} • {new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded border ${session.module === 'rural' ? 'border-[#c9a84c] text-[#c9a84c]' : 'border-[#4a7fc1] text-[#4a7fc1]'}`}>
                      {session.module === 'rural' ? 'Rural' : 'Executio'}
                    </span>
                    <span className={`text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-dashed border-border p-8 text-center text-muted-foreground">
              No recent sessions found. Select a module to start your first analysis.
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
