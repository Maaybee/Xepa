/**
 * Ações que mudam estado no servidor (registrar consumo, lançar despesa,
 * concluir lavagem). Guarda o "executando" para travar o botão, o erro para
 * mostrar na tela e o aviso que a API devolve junto do sucesso — é assim que
 * chegam o alerta de reposição (RN08), o de orçamento (RN12) e o de lavagem
 * (RN14).
 */

import { useCallback, useState } from 'react';
import { mensagemDe } from './useRequisicao';

export interface Acao {
  executando: boolean;
  erro: string | null;
  aviso: string | null;
  limparAvisos(): void;
  executar<T>(acao: () => Promise<T>, extrairAviso?: (resultado: T) => string | null): Promise<T | null>;
}

export function useAcao(): Acao {
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const limparAvisos = useCallback(() => {
    setErro(null);
    setAviso(null);
  }, []);

  const executar = useCallback(async function <T>(
    acao: () => Promise<T>,
    extrairAviso?: (resultado: T) => string | null,
  ): Promise<T | null> {
    setExecutando(true);
    setErro(null);
    setAviso(null);
    try {
      const resultado = await acao();
      setAviso(extrairAviso?.(resultado) ?? null);
      return resultado;
    } catch (causa) {
      setErro(mensagemDe(causa));
      return null;
    } finally {
      setExecutando(false);
    }
  }, []);

  return { executando, erro, aviso, limparAvisos, executar };
}
