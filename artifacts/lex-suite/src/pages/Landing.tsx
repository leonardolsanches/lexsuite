import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, Scale, Wheat } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
      
      <div className="z-10 max-w-4xl w-full space-y-12 text-center">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-card border border-border rounded-2xl flex items-center justify-center shadow-xl">
              <span className="font-serif italic font-semibold text-5xl text-primary">ℓ</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif tracking-tight font-semibold">
            Lex Suite
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-sans leading-relaxed">
            O cockpit de inteligência jurídica para advogados brasileiros. Analise processos, extraia fundamentos e elabore peças com precisão.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link href="/sign-in">
              <Button size="lg" className="text-lg px-8 font-sans" data-testid="btn-signin">
                Entrar <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-12">
          <Card className="bg-card border-border shadow-lg text-left overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#c9a84c]"></div>
            <CardHeader className="space-y-4">
              <div className="h-12 w-12 rounded-lg bg-[#c9a84c]/10 text-[#c9a84c] flex items-center justify-center">
                <Wheat className="w-6 h-6" />
              </div>
              <CardTitle className="font-serif text-2xl">Lex Rural</CardTitle>
              <CardDescription className="text-base font-sans">
                Módulo especializado em crédito rural e agronegócio. Analise contratos, CCB, CPR e operações do MCR com fundamentação precisa.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card border-border shadow-lg text-left overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#4a7fc1]"></div>
            <CardHeader className="space-y-4">
              <div className="h-12 w-12 rounded-lg bg-[#4a7fc1]/10 text-[#4a7fc1] flex items-center justify-center">
                <Scale className="w-6 h-6" />
              </div>
              <CardTitle className="font-serif text-2xl">Lex Executio</CardTitle>
              <CardDescription className="text-base font-sans">
                Módulo de execuções bancárias e cumprimento de sentença. Analise fases processuais, calcule débitos e elabore embargos.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
