import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, WifiOff } from 'lucide-react';
import logo from '@/assets/logo-7estrivos.png';

const LoginPage = () => {
  const { login, isLoggedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState<'invalid' | 'network' | 'timeout' | 'generic' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      navigate('/');
    }
  }, [authLoading, isLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorKind(null);
    if (!username || !password) {
      setError('Preencha todos os campos.');
      setErrorKind('generic');
      return;
    }
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result === 'ok') {
        navigate('/');
      } else if (result === 'network') {
        setError('Sem conexão com o servidor. Verifique sua internet, antivírus ou DNS.');
        setErrorKind('network');
      } else if (result === 'timeout') {
        setError('O servidor demorou demais para responder. Tente novamente em instantes.');
        setErrorKind('timeout');
      } else if (result === 'invalid_credentials') {
        setError('Usuário ou senha incorretos. Verifique e tente novamente.');
        setErrorKind('invalid');
      } else {
        setError('Não foi possível entrar agora. Tente novamente.');
        setErrorKind('generic');
      }
    } catch (err: any) {
      console.error('[LoginPage] submit exception:', err);
      setError('Falha de conexão. Verifique sua internet e tente novamente.');
      setErrorKind('network');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 orange-gradient">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card rounded-xl p-8 western-shadow">
          <div className="text-center mb-6">
            <img src={logo} alt="7ESTRIVOS" className="h-20 w-20 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-display font-bold">Entrar</h1>
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full bg-muted rounded-lg px-4 py-3 pr-12 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  disabled={loading}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className={`text-sm ${errorKind === 'network' || errorKind === 'timeout' ? 'text-primary' : 'text-destructive'}`}>
                {error}
              </p>
            )}

            {errorKind === 'network' && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-xs text-foreground/90 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <WifiOff className="w-4 h-4" />
                  Diagnóstico de conexão
                </div>
                <p className="text-muted-foreground">
                  Seu computador não conseguiu acessar o servidor de autenticação. Tente:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Verificar sua conexão com a internet</li>
                  <li>Abrir o sistema em uma aba anônima</li>
                  <li>Tentar em outra rede (ex.: 4G do celular)</li>
                  <li>Pedir ao TI para liberar <code className="bg-muted px-1 rounded">*.supabase.co</code> no firewall/antivírus</li>
                  <li>Trocar o DNS do computador para <code className="bg-muted px-1 rounded">1.1.1.1</code> ou <code className="bg-muted px-1 rounded">8.8.8.8</code></li>
                </ul>
              </div>
            )}

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
