import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Database, Upload, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function Documents({ module }: { module: 'rural' | 'executio' }) {
  // Placeholder implementation for RAG documents
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-[60px] border-b border-border bg-card px-6 flex items-center gap-4 sticky top-0 z-50">
        <Link href={`/app/${module}`}>
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>
        </Link>
        <Database className={`w-5 h-5 ${module === 'rural' ? 'text-[#c9a84c]' : 'text-[#4a7fc1]'}`} />
        <span className="font-serif font-semibold text-lg text-foreground">Knowledge Base • Lex {module === 'rural' ? 'Rural' : 'Executio'}</span>
      </header>

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">Documents</h1>
            <p className="text-muted-foreground font-sans">Upload reference documents for AI context analysis.</p>
          </div>
          <Button className="gap-2">
            <Upload className="w-4 h-4" /> Upload Document
          </Button>
        </div>

        <div className="grid gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {/* Dummy Data */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">Jurisprudence_Reference_0{i}.pdf</h3>
                        <p className="text-sm text-muted-foreground">2.4 MB • Uploaded Oct 12, 2023</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {i === 1 ? (
                        <span className="flex items-center gap-1.5 text-primary">
                          <CheckCircle2 className="w-4 h-4" /> Indexed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-4 h-4" /> Indexing...
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
