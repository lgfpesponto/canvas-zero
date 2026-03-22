import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import logo from '@/assets/logo-7estrivos.png';

const RecoverPasswordPage = () => {
  const { recoverPassword } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [digits, setDigits] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!cpfCnpj) { setError('Informe seu CPF ou CNPJ.'); return; }
    setStep(2);
  };

  const handleDigits = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (digits.length < 3) { setError('Digite os 3 primeiros dígitos.'); return; }
    setLoading(true);
    const ok = await recoverPassword(cpfCnpj, digits);
    setLoading(false);
    if (ok) {
      setStep(3);
    } else {
      setError('Dígitos incorretos.');
    }
  };

  const handleNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Senha deve ter no mínimo 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setError('Senhas não conferem.'); return; }
    navigate('/login');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card rounded-xl p-8 western-shadow">
          <div className="text-center mb-6">
            <img src={logo} alt="7ESTRIVOS" className="h-16 w-16 mx-auto mb-3 object-contain" />
            <h1 className="text-2xl font-display font-bold">Recuperar Senha</h1>
          </div>

          {step === 1 && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">CPF ou CNPJ</label>
                <input type="text" value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button type="submit" className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity">CONTINUAR</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleDigits} className="space-y-4">
              <p className="text-sm text-muted-foreground">Digite os 3 primeiros dígitos do seu CPF/CNPJ para verificação.</p>
              <div>
                <label className="block text-sm font-semibold mb-1">3 Primeiros Dígitos</label>
                <input type="text" maxLength={3} value={digits} onChange={e => setDigits(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="000" className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none text-center text-2xl tracking-[0.5em]" />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? 'VERIFICANDO...' : 'VERIFICAR'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleNewPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nova Senha</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••" className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Confirmar Nova Senha</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••" className="w-full bg-muted rounded-lg px-4 py-3 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button type="submit" className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity">SALVAR NOVA SENHA</button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RecoverPasswordPage;
