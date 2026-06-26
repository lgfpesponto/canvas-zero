import { Link2, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TamanhoSku } from '@/hooks/useTemplateManagement';

const cls = {
  label: 'block text-sm font-semibold mb-1',
  select:
    'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none',
  input:
    'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none',
};

interface Props {
  nome: string;
  onNome: (v: string) => void;
  modelo?: string;
  onModelo?: (v: string) => void;
  showModelo?: boolean;
  modeloOptions?: string[];
  genero: string;
  onGenero: (v: string) => void;
  sku: string;
  onSku: (v: string) => void;
  fotoUrl: string;
  onFotoUrl: (v: string) => void;
  tamanhosSkus: TamanhoSku[];
  onTamanhosSkus: (next: TamanhoSku[]) => void;
}

export const TemplateHeaderFields = ({
  nome, onNome,
  modelo, onModelo, showModelo, modeloOptions,
  genero, onGenero,
  sku, onSku,
  fotoUrl, onFotoUrl,
  tamanhosSkus, onTamanhosSkus,
}: Props) => {
  return (
    <div className="space-y-3">
      {/* 1. Link da Foto de Referência */}
      <div>
        <label className={cls.label}>Link da Foto de Referência (Google Drive)</label>
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            type="url"
            value={fotoUrl}
            onChange={e => onFotoUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            className={cls.input}
          />
          {fotoUrl && (
            <button
              type="button"
              onClick={() => onFotoUrl('')}
              className="text-destructive hover:text-destructive/80"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Nome do Modelo */}
      <div>
        <label className={cls.label}>
          Nome do Modelo<span className="text-destructive ml-0.5">*</span>
        </label>
        <input
          type="text"
          value={nome}
          onChange={e => onNome(e.target.value)}
          placeholder="Ex: Texana tradicional"
          className={cls.input}
        />
      </div>

      {/* 3. Modelo + Gênero lado a lado */}
      <div className="grid sm:grid-cols-2 gap-3">
        {showModelo && (
          <div>
            <label className={cls.label}>Modelo</label>
            {modeloOptions && modeloOptions.length > 0 ? (
              <select value={modelo || ''} onChange={e => onModelo?.(e.target.value)} className={cls.select}>
                <option value="">—</option>
                {modeloOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={modelo || ''}
                onChange={e => onModelo?.(e.target.value)}
                className={cls.input}
              />
            )}
          </div>
        )}
        <div className={showModelo ? '' : 'sm:col-span-2'}>
          <label className={cls.label}>Gênero</label>
          <select value={genero} onChange={e => onGenero(e.target.value)} className={cls.select}>
            <option value="">—</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Unissex">Unissex</option>
            <option value="Infantil">Infantil</option>
          </select>
        </div>
      </div>

      {/* 4. SKU base */}
      <div>
        <label className={cls.label}>
          SKU base{' '}
          <span className="text-xs font-normal text-muted-foreground">
            (quando o produto não varia por tamanho)
          </span>
        </label>
        <input
          type="text"
          value={sku}
          onChange={e => onSku(e.target.value)}
          placeholder="Ex: TEX-AMANDA-PE"
          className={cls.input}
        />
      </div>

      {/* 5. Tamanhos disponíveis + SKU */}
      <div className="border rounded-lg p-3 bg-muted/30">
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold text-sm">Tamanhos disponíveis + SKU</div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onTamanhosSkus([...(tamanhosSkus || []), { tamanho: '', sku: '' }])
            }
          >
            <Plus size={14} className="mr-1" /> Adicionar tamanho
          </Button>
        </div>
        {tamanhosSkus && tamanhosSkus.length > 0 && (
          <div className="space-y-2 mt-3">
            {tamanhosSkus.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[100px_1fr_auto] gap-2 items-center">
                <input
                  type="text"
                  value={row.tamanho}
                  onChange={e => {
                    const next = [...tamanhosSkus];
                    next[idx] = { ...next[idx], tamanho: e.target.value };
                    onTamanhosSkus(next);
                  }}
                  placeholder="Tam (ex 36)"
                  className={cls.input}
                />
                <input
                  type="text"
                  value={row.sku}
                  onChange={e => {
                    const next = [...tamanhosSkus];
                    next[idx] = { ...next[idx], sku: e.target.value };
                    onTamanhosSkus(next);
                  }}
                  placeholder="SKU (ex TEX-AMANDA-PE-36)"
                  className={cls.input}
                />
                <button
                  type="button"
                  onClick={() => onTamanhosSkus(tamanhosSkus.filter((_, i) => i !== idx))}
                  className="text-destructive hover:text-destructive/80 p-2"
                  title="Remover"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
