/**
 * Carrega dados da API e devolve os três estados que toda tela precisa tratar:
 * carregando, erro e dados. `recarregar` serve tanto para o "puxar para
 * atualizar" quanto para refazer a busca depois de uma ação que muda o estado.
 */

import { useCallback, useEffect, useState } from 'react';
import { ErroDaApi } from '@/services/api/cliente';

export interface Requisicao<T> {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
  recarregar(): Promise<void>;
}

export function useRequisicao<T>(buscar: () => Promise<T>, dependencias: unknown[] = []): Requisicao<T> {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const executar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await buscar());
    } catch (causa) {
      // Um 401 já derruba a sessão no cliente HTTP; aqui só não vale gritar.
      if (causa instanceof ErroDaApi && causa.status === 401) return;
      setErro(mensagemDe(causa));
    } finally {
      setCarregando(false);
    }
    // `buscar` costuma ser uma arrow nova a cada render; quem manda são as
    // dependências declaradas pela tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => {
    void executar();
  }, [executar]);

  return { dados, carregando, erro, recarregar: executar };
}

/** As mensagens da API já vêm em português, prontas para o usuário. */
export function mensagemDe(causa: unknown): string {
  if (causa instanceof ErroDaApi) return causa.message;
  if (causa instanceof Error) return causa.message;
  return 'Algo deu errado. Tente de novo.';
}
