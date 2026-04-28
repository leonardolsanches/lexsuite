import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Database, Upload, FileText, CheckCircle2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useListDocuments, getListDocumentsQueryKey, useDeleteDocument } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

async function uploadFilesToServer(
  files: File[],
  module: 'rural' | 'executio',
  authToken: string | null
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);

    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      const res = await fetch(`${apiBase}/api/documents/upload`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        errors.push(`${file.name}: ${body.error ?? res.statusText}`);
      }
    } catch (e: any) {
      errors.push(`${file.name}: ${e?.message ?? 'Erro de rede'}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export default function Documents({ module }: { module: 'rural' | 'executio' }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const hasIndexing = (docs: any[]) => docs.some((d: any) => d.status === 'indexing');

  const { data: docs = [], isLoading } = useListDocuments({
    query: {
      queryKey: getListDocumentsQueryKey(),
      refetchInterval: (query) => {
        const data = query.state.data as any[] | undefined;
        return data && hasIndexing(data.filter((d: any) => d.module === module)) ? 5000 : false;
      },
    },
  });

  const moduleDocs = docs.filter((d: any) => d.module === module);

  const del = useDeleteDocument();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const pdfs = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfs.length === 0) {
      toast({ title: 'Formato inválido', description: 'Selecione arquivos PDF.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const { ok, errors } = await uploadFilesToServer(pdfs, module, null);
    await qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    setUploading(false);

    if (ok) {
      toast({ title: 'Upload concluído', description: 'Indexação em andamento...' });
    } else {
      for (const err of errors) {
        toast({ title: 'Erro no upload', description: err, variant: 'destructive' });
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await del.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e?.message ?? 'Tente novamente.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-[60px] border-b border-border bg-card px-6 flex items-center gap-4 sticky top-0 z-50">
        <Link href={`/app/${module}`}>
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>
        </Link>
        <Database className={`w-5 h-5 ${module === 'rural' ? 'text-[#c9a84c]' : 'text-[#4a7fc1]'}`} />
        <span className="font-serif font-semibold text-lg text-foreground">
          Base de Conhecimento &bull; Lex {module === 'rural' ? 'Rural' : 'Executio'}
        </span>
      </header>

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground mb-2">Documentos de Referência</h1>
            <p className="text-muted-foreground font-sans text-sm">
              Carregue jurisprudência, contratos-modelo e legislação para enriquecer o contexto das análises.
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            data-testid="btn-upload-doc"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Enviando...' : 'Carregar PDF'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Carregando documentos...</div>
        ) : moduleDocs.length === 0 ? (
          <Card className="bg-card border-dashed border-border">
            <CardContent className="p-12 text-center space-y-4">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
              <p className="text-muted-foreground font-sans text-sm">
                Nenhum documento indexado ainda. Carregue PDFs para usar como referência nas análises.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {moduleDocs.map((doc: any) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-medium text-foreground truncate">{doc.filename}</h3>
                        <p className="text-sm text-muted-foreground">
                          {doc.chunkCount} {doc.chunkCount === 1 ? 'trecho' : 'trechos'} &bull;{' '}
                          {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {doc.status === 'ready' && (
                        <span className="flex items-center gap-1.5 text-sm text-primary">
                          <CheckCircle2 className="w-4 h-4" /> Indexado
                        </span>
                      )}
                      {doc.status === 'indexing' && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Indexando...
                        </span>
                      )}
                      {doc.status === 'error' && (
                        <span className="flex items-center gap-1.5 text-sm text-destructive">
                          <AlertCircle className="w-4 h-4" /> Erro na indexação
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(doc.id)}
                        data-testid={`btn-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
