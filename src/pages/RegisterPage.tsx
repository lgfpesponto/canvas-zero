import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '@/assets/logo-7estrivos.png';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nomeCompleto: '', nomeUsuario: '', telefone: '', email: '', cpfCnpj: '', senha: '', confirmarSenha: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => {
    if (field === 'nomeUsuario') {
      value = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    }
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (Object.values(form).some(v => !v)) { setError('Preencha todos os campos.'); return; }
    if (form.senha.length < 6) { setError('Senha deve ter no mínimo 6 caracteres.'); return; }
    if (form.senha !== form.confirmarSenha) { setError('Senhas não conferem.'); return; }

    setLoading(true);
    const { confirmarSenha, ...data } = form;
    const success = await register(data);
    setLoading(false);
    if (success) {
      navigate('/login');
    } else {
      setError('Nome de usuário já existe.');
    }
  };

  const fields = [
    { key: 'nomeCompleto', label: 'Nome Completo', type: 'text', placeholder: 'João da Silva' },
    { key: 'nomeUsuario', label: 'Nome de Usuário', type: 'text', placeholder: 'joaosilva' },
    { key: 'telefone', label: 'Telefone WhatsApp', type: 'tel', placeholder: '(11) 99999-9999' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'joao@email.com' },
    { key: 'cpfCnpj', label: 'CPF ou CNPJ', type: 'text', placeholder: '000.000.000-00' },
    { key: 'senha', label: 'Senha (mín. 6 dígitos)', type: 'password', placeholder: '••••••' },
    { key: 'confirmarSenha', label: 'Confirmar Senha', type: 'password', placeholder: '••••••' },
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card rounded-xl p-8 western-shadow">
          <div className="text-center mb-6">
            <img src={logo} alt="7ESTRIVOS" className="h-16 w-16 mx-auto mb-3 object-contain" />
            <h1 className="text-2xl font-display font-bold">Criar Conta</h1>
            <p className="text-sm text-muted-foreground mt-1">Cadastre-se como revendedor</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-sm font-semibold mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            ))}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <button type="submit" disabled={loading} className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'CRIANDO...' : 'CRIAR CONTA'}
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-4">
            Já tem conta? <Link to="/login" className="text-primary font-semibold hover:underline">Entrar</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
