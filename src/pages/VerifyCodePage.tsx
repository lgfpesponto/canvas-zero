import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/logo-7estrivos.png';

const VerifyCodePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'choose' | 'input'>('choose');
  const [type, setType] = useState<'email' | 'sms'>('email');
  const [maskedDest, setMaskedDest] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  

  const sendCode = async (selectedType: 'email' | 'sms') => {
    setLoading(true);
    setType(selectedType);

    const { data, error } = await supabase.functions.invoke('send-verification-code', {
      body: { type: selectedType },
    });

    setLoading(false);

    if (error || !data?.success) {
      toast.error(data?.error || 'Erro ao enviar código');
      return;
    }

    setMaskedDest(data.destination);
    
    setStep('input');
    toast.success(data.message);
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('verify-code', {
      body: { code },
    });
    setLoading(false);

    if (error || !data?.success) {
      toast.error(data?.error || 'Código inválido');
      return;
    }

    toast.success('Conta verificada com sucesso!');
    // Force reload to update auth state
    window.location.href = '/';
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="bg-card rounded-xl p-8 western-shadow">
          <div className="text-center mb-6">
            <img src={logo} alt="7ESTRIVOS" className="h-16 w-16 mx-auto mb-3 object-contain" />
            <h1 className="text-2xl font-display font-bold">Verificar Conta</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 'choose'
                ? 'Escolha como deseja receber seu código de verificação'
                : `Código enviado para ${maskedDest}`}
            </p>
          </div>

          {step === 'choose' ? (
            <div className="space-y-3">
              <button
                onClick={() => sendCode('email')}
                disabled={loading}
                className="w-full bg-muted rounded-lg px-4 py-4 text-left border border-border hover:border-primary transition-colors disabled:opacity-50"
              >
                <div className="font-semibold text-sm">📧 Receber por Email</div>
                <div className="text-xs text-muted-foreground mt-1">Enviaremos um código para seu email cadastrado</div>
              </button>

              <button
                onClick={() => sendCode('sms')}
                disabled={loading}
                className="w-full bg-muted rounded-lg px-4 py-4 text-left border border-border hover:border-primary transition-colors disabled:opacity-50"
              >
                <div className="font-semibold text-sm">📱 Receber por SMS</div>
                <div className="text-xs text-muted-foreground mt-1">Enviaremos um código para seu telefone cadastrado</div>
              </button>

              {loading && <p className="text-center text-sm text-muted-foreground">Enviando código...</p>}
            </div>
          ) : (
            <div className="space-y-4">

              <div>
                <label className="block text-sm font-semibold mb-2 text-center">Digite o código de 6 dígitos</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full bg-muted rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <button
                onClick={verifyCode}
                disabled={loading || code.length !== 6}
                className="w-full orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'VERIFICANDO...' : 'VERIFICAR'}
              </button>

              <button
                onClick={() => { setStep('choose'); setCode(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Reenviar código
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyCodePage;
