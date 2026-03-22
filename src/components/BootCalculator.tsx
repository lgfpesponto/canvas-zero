import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BASE_PRICE = 650;

const extras: Record<string, number> = {
  'Bordado Premium': 120,
  'Couro Exótico': 250,
  'Solado Especial': 80,
  'Personalização Nome': 60,
  'Sob Medida': 150,
  'Metais Especiais': 90,
  'Tiras Decorativas': 70,
};

const BootCalculator = () => {
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [quantidade, setQuantidade] = useState(1);
  const navigate = useNavigate();

  const toggle = (extra: string) => {
    setSelectedExtras(prev =>
      prev.includes(extra) ? prev.filter(e => e !== extra) : [...prev, extra]
    );
  };

  const extraTotal = selectedExtras.reduce((s, e) => s + (extras[e] || 0), 0);
  const unitPrice = BASE_PRICE + extraTotal;
  const total = unitPrice * quantidade;

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="bg-card rounded-xl p-6 western-shadow">
      <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-4">
        <Calculator className="text-primary" size={22} /> Calculadora de Valor
      </h2>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="text-sm text-muted-foreground">Preço base</span>
          <span className="font-semibold">{formatCurrency(BASE_PRICE)}</span>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Extras:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(extras).map(([name, price]) => (
              <button
                key={name}
                onClick={() => toggle(name)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  selectedExtras.includes(name)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-primary/10'
                }`}
              >
                {name} (+{formatCurrency(price)})
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold">Quantidade:</label>
          <input
            type="number"
            min={1}
            max={100}
            value={quantidade}
            onChange={e => setQuantidade(Math.max(1, Number(e.target.value)))}
            className="w-20 bg-muted rounded-md px-3 py-1.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      <div className="bg-muted rounded-lg p-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Extras selecionados</span>
          <span>{formatCurrency(extraTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Valor unitário</span>
          <span>{formatCurrency(unitPrice)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t border-border pt-2 mt-2">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      <button
        onClick={() => navigate('/pedido')}
        className="w-full mt-4 orange-gradient text-primary-foreground py-3 rounded-lg font-bold tracking-wider hover:opacity-90 transition-opacity"
      >
        CRIAR PEDIDO A PARTIR DA CALCULADORA
      </button>
    </div>
  );
};

export default BootCalculator;
