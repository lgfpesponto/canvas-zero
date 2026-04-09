import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Phone, CreditCard, Pencil, Check, X, HardHat, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

const ProfilePage = () => {
  const { isLoggedIn, isAdmin, user, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Server-side aggregated data
  const [pendente, setPendente] = useState(0);
  const [botasProducao, setBotasProducao] = useState(0);
  const [totalBotas, setTotalBotas] = useState(0);

  useEffect(() => {
    if (!user || isAdmin) return;
    // Fetch pending value
    supabase.rpc('get_pending_value', { vendor: user.nomeCompleto }).then(({ data }) => {
      if (data !== null) setPendente(Number(data));
    });
    // Fetch production counts
    supabase.rpc('get_production_counts').then(({ data }) => {
      if (data && data[0]) {
        setBotasProducao(Number(data[0].in_production));
        setTotalBotas(Number(data[0].total));
      }
    });
  }, [user, isAdmin]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nomeCompleto: '',
    email: '',
    telefone: '',
    cpfCnpj: '',
  });

  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  const startEdit = () => {
    setForm({
      nomeCompleto: user.nomeCompleto,
      email: user.email,
      telefone: user.telefone,
      cpfCnpj: user.cpfCnpj,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    updateProfile(form);
    setEditing(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold mb-6">Meu Perfil</h1>
        <div className="bg-card rounded-xl p-6 western-shadow space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={28} className="text-primary" />
              </div>
              <div>
                {editing ? (
                  <input
                    value={form.nomeCompleto}
                    onChange={e => setForm(f => ({ ...f, nomeCompleto: e.target.value }))}
                    className="font-display font-bold text-xl bg-muted rounded-lg px-3 py-1 border border-border focus:border-primary outline-none w-full"
                  />
                ) : (
                  <h2 className="font-display font-bold text-xl">{user.nomeCompleto}</h2>
                )}
                <p className="text-sm text-muted-foreground">@{user.nomeUsuario}</p>
              </div>
            </div>
            {!editing && (
              <button onClick={startEdit} className="text-primary hover:text-primary/80 transition-colors p-2">
                <Pencil size={18} />
              </button>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            {editing ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">E-mail</label>
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-muted-foreground flex-shrink-0" />
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Telefone</label>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-muted-foreground flex-shrink-0" />
                    <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">CPF/CNPJ</label>
                  <div className="flex items-center gap-3">
                    <CreditCard size={16} className="text-muted-foreground flex-shrink-0" />
                    <input value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} className="bg-muted rounded-lg px-3 py-2 text-sm border border-border focus:border-primary outline-none w-full" />
                  </div>
                </div>
                <div className="flex gap-2 pt-3">
                  <button onClick={saveEdit} className="orange-gradient text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                    <Check size={16} /> Salvar
                  </button>
                  <button onClick={() => setEditing(false)} className="bg-muted text-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-muted/80">
                    <X size={16} /> Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-muted-foreground" />
                  <span className="text-sm">{user.telefone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-muted-foreground" />
                  <span className="text-sm">{user.cpfCnpj}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {!isAdmin && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl p-6 western-shadow mt-6">
              <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
                <AlertCircle className="text-primary" size={22} /> Pendente
              </h2>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Valor Pendente</p>
                <p className="text-3xl font-bold text-primary mt-1">{formatCurrency(pendente)}</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl p-6 western-shadow mt-6">
              <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
                <HardHat className="text-primary" size={22} /> Botas na produção
              </h2>
              <div className="bg-muted rounded-lg p-4 mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total em produção</p>
                <p className="text-3xl font-bold text-primary mt-1">{botasProducao} {botasProducao === 1 ? 'bota' : 'botas'}</p>
              </div>
              <Progress value={totalBotas > 0 ? (botasProducao / totalBotas) * 100 : 0} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">{botasProducao} de {totalBotas} botas totais estão em produção</p>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ProfilePage;
