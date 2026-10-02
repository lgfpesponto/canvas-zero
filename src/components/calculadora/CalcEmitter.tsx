import { useEffect, useRef } from 'react';

export interface CalcData {
  tipo: 'bota' | 'cinto';
  total: number;
  formData: Record<string, string>;
  grupos: { categoria: string; itens: [string, string][] }[];
}

/** Envia o estado da ficha para a calculadora (componente filho para não violar regras de hooks). */
export default function CalcEmitter({ data, onChange }: { data: CalcData; onChange?: (d: CalcData) => void }) {
  const last = useRef('');
  useEffect(() => {
    const s = JSON.stringify(data);
    if (s === last.current) return;
    last.current = s;
    onChange?.(data);
  });
  return null;
}
