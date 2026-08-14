import { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import VariacaoFotoIcon from '@/components/ficha/VariacaoFotoIcon';
import { focusNextFrom, FICHA_FOCUS_OPEN } from '@/lib/fichaNav';


interface SearchableSelectProps {
  options: string[] | { label: string; preco?: number }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Optional lookup returning a photo URL for a given option label (renders 👁 icon). */
  fotoLookup?: (label: string) => string | null | undefined;
  /** Abre a lista automaticamente quando o campo recebe o foco (navegação por Enter). */
  autoOpenOnFocus?: boolean;
  /** Após escolher (ou fechar), move o foco para o próximo campo da ficha. */
  advanceOnSelect?: boolean;
  /** Rótulo "sugerido" mostrado ao lado da primeira opção. */
  sugerida?: string | null;
  /** Ignora este campo na navegação por Enter da ficha. */
  navSkip?: boolean;
}

const SearchableSelect = ({
  options, value, onValueChange, placeholder = 'Selecione...', className, fotoLookup,
  autoOpenOnFocus, advanceOnSelect, sugerida, navSkip,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Abertura programática: a navegação por Enter dispara este evento no trigger.
  useEffect(() => {
    const el = triggerRef.current;
    if (!el || !autoOpenOnFocus) return;
    const abrir = () => setOpen(true);
    el.addEventListener(FICHA_FOCUS_OPEN, abrir as EventListener);
    return () => el.removeEventListener(FICHA_FOCUS_OPEN, abrir as EventListener);
  }, [autoOpenOnFocus]);

  const normalizedOptions = options.map(o => {
    if (typeof o === 'string') return { label: o, display: o };
    return { label: o.label, display: o.preco ? `${o.label} (R$${o.preco})` : o.label };
  });

  const displayValue = normalizedOptions.find(o => o.label === value)?.display || '';
  const selectedFoto = fotoLookup && value ? fotoLookup(value) : null;

  const fecharEAvancar = () => {
    setOpen(false);
    if (!advanceOnSelect) return;
    setTimeout(() => focusNextFrom(triggerRef.current), 60);
  };

  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sugNorm = sugerida ? norm(sugerida) : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          data-ficha-nav={navSkip ? 'false' : 'true'}
          data-ficha-filled={value ? 'true' : 'false'}
          aria-expanded={open}
          className={cn(
            'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none flex items-center justify-between text-left',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate flex items-center gap-1">
            {displayValue || placeholder}
            {selectedFoto && <VariacaoFotoIcon fotoUrl={selectedFoto} nome={value} />}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar..." />
          <CommandList>
            <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
            <CommandGroup>
              {normalizedOptions.map(o => {
                const foto = fotoLookup ? fotoLookup(o.label) : null;
                const isSug = !!sugNorm && (norm(o.label) === sugNorm || norm(o.label).includes(sugNorm));
                return (
                  <CommandItem
                    key={o.label}
                    value={o.label}
                    onSelect={() => {
                      onValueChange(value === o.label ? '' : o.label);
                      fecharEAvancar();
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === o.label ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1">{o.display}</span>
                    {isSug && <span className="ml-2 text-[10px] font-semibold text-primary uppercase">sugerido</span>}
                    {foto && <VariacaoFotoIcon fotoUrl={foto} nome={o.label} />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
