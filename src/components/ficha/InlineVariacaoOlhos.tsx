import VariacaoFotoIcon from './VariacaoFotoIcon';
import { useFichaVariacoesLookup } from '@/hooks/useFichaVariacoesLookup';

interface Props {
  names?: string | string[] | null;
  size?: number;
}

/**
 * Renderiza um ícone de olho para cada variação (nome) que tem foto_url
 * cadastrada em ficha_variacoes. Silencioso quando não encontra foto.
 */
export function InlineVariacaoOlhos({ names, size = 14 }: Props) {
  const { findFotoByName } = useFichaVariacoesLookup();
  if (!names) return null;
  const list = (Array.isArray(names) ? names : [names])
    .map(n => (n || '').toString().trim())
    .filter(Boolean);
  if (!list.length) return null;
  return (
    <>
      {list.map((n, i) => {
        const foto = findFotoByName(n);
        if (!foto) return null;
        return <VariacaoFotoIcon key={`${n}-${i}`} fotoUrl={foto} nome={n} size={size} />;
      })}
    </>
  );
}

export default InlineVariacaoOlhos;
