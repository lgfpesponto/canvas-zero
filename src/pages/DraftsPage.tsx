import { useAuth } from '@/contexts/AuthContext';
import { getDrafts, deleteDraft, Draft } from '@/lib/drafts';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Edit, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

const DraftsPage = () => {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) setDrafts(getDrafts(user.id));
  }, [user]);

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
              return (
                <div key={draft.id} className="bg-card rounded-xl p-4 western-shadow flex items-center gap-4">
                  <FileText size={20} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold truncate">
                      {draft.numeroPedido || 'Sem número'}
                      {clienteName && <span className="text-sm text-muted-foreground ml-2">— {clienteName}</span>}
                      {!clienteName && draft.form.modelo && <span className="text-sm text-muted-foreground ml-2">— {draft.form.modelo}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Salvo em {new Date(draft.savedAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <button onClick={() => handleEdit(draft)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
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
  );
};

export default DraftsPage;
