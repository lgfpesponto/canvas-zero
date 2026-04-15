import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useFichaVariacoes, useUpdateVariacao, useDeleteVariacao, useBulkInsertVariacoes,
} from '@/hooks/useAdminConfig';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Trash2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ParsedItem {
  nome: string;
  preco: number;
}

export default function AdminConfigVariacoesPage() {
  const { slug, categoriaId } = useParams<{ slug: string; categoriaId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: variacoes, isLoading } = useFichaVariacoes(categoriaId);
  const updateVariacao = useUpdateVariacao();
  const deleteVariacao = useDeleteVariacao();
  const bulkInsert = useBulkInsertVariacoes();

  const [bulkText, setBulkText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoriaNome, setCategoriaNome] = useState('');

  useEffect(() => {
    if (user && user.role !== 'admin_master' && user.role !== 'admin_producao') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (categoriaId) {
      supabase.from('ficha_categorias').select('nome').eq('id', categoriaId).single()
        .then(({ data }) => { if (data) setCategoriaNome(data.nome); });
    }
  }, [categoriaId]);

  if (!user) return null;

  const handleParse = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const items: ParsedItem[] = [];
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      const nome = parts[0];
      const preco = parts[1] ? parseFloat(parts[1].replace(',', '.')) : 0;
      if (nome) items.push({ nome, preco: isNaN(preco) ? 0 : preco });
    }
    setParsed(items);
  };

  const handleBulkConfirm = () => {
    if (!categoriaId || parsed.length === 0) return;
    const startOrdem = (variacoes?.length ?? 0) + 1;
    const items = parsed.map((p, i) => ({
      categoria_id: categoriaId,
      nome: p.nome,
      preco_adicional: p.preco,
      ordem: startOrdem + i,
    }));
    bulkInsert.mutate(items, {
      onSuccess: () => {
        toast.success(`${items.length} variações adicionadas`);
        setBulkText('');
        setParsed([]);
        setDialogOpen(false);
      },
      onError: () => toast.error('Erro ao inserir variações'),
    });
  };

  const handleInlineUpdate = (id: string, field: 'nome' | 'preco_adicional' | 'ativo', value: string | number | boolean) => {
    updateVariacao.mutate({ id, [field]: value });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="mx-auto max-w-5xl"
      >
        <button
          onClick={() => navigate(`/admin/configuracoes/${slug}`)}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> voltar
        </button>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-montserrat text-xl font-bold text-foreground lowercase">
            {categoriaNome.toLowerCase() || 'variações'}
          </h1>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Upload className="h-4 w-4" /> entrada em massa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-montserrat lowercase">entrada em massa</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground mb-2">
                Cole uma lista no formato: <code>Nome | Preço</code> (uma por linha). O preço é opcional.
              </p>
              <Textarea
                rows={8}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={'Couro Nobuck | 50.00\nCouro Liso'}
              />
              <Button variant="secondary" onClick={handleParse} className="w-full">
                Processar lista
              </Button>

              {parsed.length > 0 && (
                <div className="mt-3 max-h-48 overflow-auto rounded border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{p.nome}</TableCell>
                          <TableCell className="text-right text-sm">R$ {p.preco.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-3">
                    <Button onClick={handleBulkConfirm} disabled={bulkInsert.isPending} className="w-full">
                      Confirmar {parsed.length} itens
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar variações..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}
          </div>
        ) : (() => {
          const filteredVariacoes = (variacoes ?? []).filter(v =>
            v.nome.toLowerCase().includes(searchTerm.toLowerCase())
          );
          return (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-32">Preço Adicional</TableHead>
                    <TableHead className="w-20 text-center">Ativo</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variacoes?.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs text-muted-foreground">{v.ordem}</TableCell>
                      <TableCell>
                        <Input
                          defaultValue={v.nome}
                          className="h-8 text-sm border-none shadow-none focus-visible:ring-1"
                          onBlur={e => {
                            if (e.target.value !== v.nome) handleInlineUpdate(v.id, 'nome', e.target.value);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={v.preco_adicional}
                          className="h-8 text-sm border-none shadow-none focus-visible:ring-1 w-24"
                          onBlur={e => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val !== v.preco_adicional) handleInlineUpdate(v.id, 'preco_adicional', val);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={v.ativo}
                          onCheckedChange={checked => handleInlineUpdate(v.id, 'ativo', checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm('Remover esta variação?')) {
                              deleteVariacao.mutate(v.id, {
                                onSuccess: () => toast.success('Variação removida'),
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {variacoes?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma variação cadastrada. Use "Entrada em Massa" para adicionar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
