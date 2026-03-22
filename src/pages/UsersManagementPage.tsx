import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Pencil, Trash2, Users, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  nome_completo: string;
  nome_usuario: string;
  email: string;
  telefone: string;
  cpf_cnpj: string;
  created_at: string;
}

const PROTECTED_USERNAMES = ['7estrivos', 'fernanda', 'demo'];

const UsersManagementPage = () => {
  const { isLoggedIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [deleteProfile, setDeleteProfile] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isJuliana = user?.nomeUsuario?.toLowerCase() === '7estrivos';

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !isJuliana) {
      navigate('/');
      return;
    }
    fetchProfiles();
  }, [isLoggedIn, isJuliana, authLoading]);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao carregar usuários', description: error.message, variant: 'destructive' });
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const openEdit = (p: Profile) => {
    setEditProfile(p);
    setEditForm({ nome_completo: p.nome_completo, email: p.email, telefone: p.telefone, cpf_cnpj: p.cpf_cnpj });
  };

  const handleSave = async () => {
    if (!editProfile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      nome_completo: editForm.nome_completo || '',
      email: editForm.email || '',
      telefone: editForm.telefone || '',
      cpf_cnpj: editForm.cpf_cnpj || '',
    }).eq('id', editProfile.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Usuário atualizado com sucesso!' });
      setEditProfile(null);
      fetchProfiles();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteProfile) return;
    setDeleting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const res = await supabase.functions.invoke('delete-user', {
      body: { userId: deleteProfile.id },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (res.error) {
      toast({ title: 'Erro ao excluir', description: res.error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Usuário excluído com sucesso!' });
      setDeleteProfile(null);
      fetchProfiles();
    }
    setDeleting(false);
  };

  const isProtected = (username: string) => PROTECTED_USERNAMES.includes(username.toLowerCase());

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }
  if (!isLoggedIn || !isJuliana) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Users size={24} />
            Gerenciamento de Usuários
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome_completo || '—'}</TableCell>
                    <TableCell>{p.nome_usuario}</TableCell>
                    <TableCell>{p.email || '—'}</TableCell>
                    <TableCell>{p.telefone || '—'}</TableCell>
                    <TableCell>{p.cpf_cnpj || '—'}</TableCell>
                    <TableCell>{new Date(p.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Pencil size={14} />
                      </Button>
                      {!isProtected(p.nome_usuario) && (
                        <Button size="sm" variant="destructive" onClick={() => setDeleteProfile(p)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {profiles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum usuário cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editProfile} onOpenChange={() => setEditProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário: {editProfile?.nome_usuario}</DialogTitle>
            <DialogDescription>Altere os dados do usuário abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Completo</Label>
              <Input value={editForm.nome_completo || ''} onChange={(e) => setEditForm({ ...editForm, nome_completo: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={editForm.telefone || ''} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} />
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input value={editForm.cpf_cnpj || ''} onChange={(e) => setEditForm({ ...editForm, cpf_cnpj: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfile(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteProfile} onOpenChange={() => setDeleteProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteProfile?.nome_usuario}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProfile(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagementPage;
