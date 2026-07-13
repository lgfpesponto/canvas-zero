import { useAuth } from '@/contexts/AuthContext';
import { getDrafts, deleteDraft, Draft } from '@/lib/drafts';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit, FileText, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useTemplatesValidity } from '@/hooks/useTemplateValidity';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DraftsPage = () => {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) setDrafts(getDrafts(user.id));
  }, [user]);

  // Split drafts por tipo para validar contra a ficha correta
  const { botaDrafts, cintoDrafts } = useMemo(() => {
    const b: { id: string; form_data: Record<string, unknown> }[] = [];
    const c: { id: string; form_data: Record<string, unknown> }[] = [];
    for (const d of drafts) {
      const item = { id: d.id, form_data: (d.form || {}) as Record<string, unknown> };
      if (d.id.startsWith('draft-belt-')) c.push(item);
      else b.push(item);
    }
    return { botaDrafts: b, cintoDrafts: c };
  }, [drafts]);

  const botaValidity = useTemplatesValidity(botaDrafts, 'bota');
  const cintoValidity = useTemplatesValidity(cintoDrafts, 'cinto');

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-display font-bold mb-2">Faça login para ver rascunhos</h2>
          <button onClick={() => navigate('/login')} className="orange-gradient text-primary-foreground px-6 py-2 rounded-lg font-bold">LOGIN</button>
        </div>
      </div>
    );
  }

  const handleDelete = (id: string) => {
    deleteDraft(id);
    setDrafts(prev => prev.filter(d => d.id !== id));
    toast.success('Rascunho excluído');
  };

  const handleEdit = (draft: Draft) => {
    const target = draft.id.startsWith('draft-belt-') ? '/pedido-cinto' : '/pedido';
    navigate(target, { state: { draft } });
  };

  const filtered = drafts.filter(d => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (d.numeroPedido || '').toLowerCase().includes(q) || (d.form?.cliente || d.cliente || '').toLowerCase().includes(q);
  });

  return (
    <TooltipProvider>
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/relatorios')} className="text-sm text-primary font-semibold hover:underline">← Meus Pedidos</button>
        </div>
        <h1 className="text-3xl font-display font-bold mb-6">Rascunhos</h1>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar por número ou cliente..."
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">{search.trim() ? 'Nenhum rascunho encontrado.' : 'Nenhum rascunho salvo.'}</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(draft => {
              const clienteName = draft.form?.cliente || draft.cliente || '';
              const isCinto = draft.id.startsWith('draft-belt-');
              const validity = (isCinto ? cintoValidity : botaValidity).get(draft.id);
              const invalid = validity && !validity.valid;
              return (
                <div key={draft.id} className="bg-card rounded-xl p-4 western-shadow flex items-center gap-4">
                  <FileText size={20} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold truncate">
                      {draft.numeroPedido || 'Sem número'}
                      {clienteName && <span className="text-sm text-muted-foreground ml-2">— {clienteName}</span>}
                      {!clienteName && draft.form.modelo && <span className="text-sm text-muted-foreground ml-2">— {draft.form.modelo}</span>}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        Salvo em {new Date(draft.savedAt).toLocaleString('pt-BR')}
                      </p>
                      {invalid && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-destructive/15 text-destructive">
                              <AlertTriangle size={10} /> variação excluída, entre para editar
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs font-semibold mb-1">Itens removidos da ficha:</p>
                            <ul className="text-xs space-y-0.5">
                              {validity!.removed.map((r, i) => (
                                <li key={i}>• {r.campo}: {r.valor}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => !invalid && handleEdit(draft)}
                    disabled={!!invalid}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    title={invalid ? 'Não é possível continuar: uma variação foi removida da ficha' : undefined}
                  >
                    <Edit size={14} /> Continuar
                  </button>
                  <button onClick={() => handleDelete(draft.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
    </TooltipProvider>
  );
};

export default DraftsPage;
