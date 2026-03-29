import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface SearchableSelectProps {
  options: string[] | { label: string; preco?: number }[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchableSelect = ({ options, value, onValueChange, placeholder = 'Selecione...', className }: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);

  const normalizedOptions = options.map(o => {
    if (typeof o === 'string') return { label: o, display: o };
    return { label: o.label, display: o.preco ? `${o.label} (R$${o.preco})` : o.label };
  });

  const displayValue = normalizedOptions.find(o => o.label === value)?.display || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full bg-muted rounded-lg px-4 py-2.5 text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none flex items-center justify-between text-left',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Pesquisar..." />
          <CommandList>
            <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
            <CommandGroup>
              {normalizedOptions.map(o => (
                <CommandItem
                  key={o.label}
                  value={o.label}
                  onSelect={() => {
                    onValueChange(o.label);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === o.label ? 'opacity-100' : 'opacity-0')} />
                  {o.display}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
