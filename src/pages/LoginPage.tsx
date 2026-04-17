import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '@/assets/logo-7estrivos.png';

const LoginPage = () => {
  const { login, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If user is already logged in (e.g. opened /login with active session), redirect to home
  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      navigate('/');
    }
  }, [authLoading, isLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result === 'ok') {
        navigate('/');
      } else {
        setError('Usuário ou senha incorretos. Verifique e tente novamente.');
      }
    } catch (err: any) {
      console.error('[LoginPage] submit exception:', err);
      setError('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setLoading(false);
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
                autoComplete="username"
                disabled={loading}
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                disabled={loading}
                className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-60"
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
