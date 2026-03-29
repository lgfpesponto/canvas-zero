import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '@/assets/logo-7estrivos.png';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Preencha todos os campos.'); return; }
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result === 'ok') {
      navigate('/');
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card rounded-xl p-8 western-shadow">
          <div className="text-center mb-6">
            <img src={logo} alt="7ESTRIVOS" className="h-20 w-20 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-display font-bold">Entrar</h1>
            <p className="text-sm text-muted-foreground mt-1">Acesse sua conta de revendedor</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Nome de Usuário</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Seu nome de usuário"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <button type="submit" disabled={loading} className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? 'ENTRANDO...' : 'ENTRAR'}
            </button>
          </form>

        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
