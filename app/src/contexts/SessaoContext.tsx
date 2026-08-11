/**
 * Sessão do usuário.
 *
 * O token fica no SecureStore (Keychain no iOS), nunca em armazenamento
 * comum: é o equivalente, no cliente, ao cuidado que o backend tem de guardar
 * só o hash (RNF07). Quando a API responde 401 — sessão expirada por
 * inatividade (RNF09) — a sessão é derrubada aqui e o app volta para o login.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as contaApi from '@/services/api/conta';
import {
  definirToken,
  definirTratamentoDeSessaoExpirada,
} from '@/services/api/cliente';
import type { Perfil } from '@/types/api';

const CHAVE_TOKEN = 'xepa.sessao.token';
const CHAVE_PERFIL = 'xepa.sessao.perfil';

interface ValorSessao {
  /** `true` enquanto a sessão guardada no aparelho ainda está sendo lida. */
  restaurando: boolean;
  perfil: Perfil | null;
  autenticado: boolean;
  entrar(email: string, senha: string): Promise<void>;
  cadastrar(nome: string, email: string, senha: string): Promise<void>;
  sair(): Promise<void>;
  definirPerfil(perfil: Perfil): void;
}

const Contexto = createContext<ValorSessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [restaurando, setRestaurando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  /** Evita gravar no SecureStore durante a restauração inicial. */
  const montado = useRef(true);

  const descartarSessao = useCallback(async () => {
    definirToken(null);
    setPerfil(null);
    await Promise.all([
      SecureStore.deleteItemAsync(CHAVE_TOKEN),
      SecureStore.deleteItemAsync(CHAVE_PERFIL),
    ]).catch(() => undefined);
  }, []);

  const guardarSessao = useCallback(async (token: string, novoPerfil: Perfil) => {
    definirToken(token);
    setPerfil(novoPerfil);
    await Promise.all([
      SecureStore.setItemAsync(CHAVE_TOKEN, token),
      SecureStore.setItemAsync(CHAVE_PERFIL, JSON.stringify(novoPerfil)),
    ]);
  }, []);

  // Restaura a sessão guardada e confirma com a API: um token que expirou
  // enquanto o app estava fechado não pode passar por sessão válida.
  useEffect(() => {
    montado.current = true;

    (async () => {
      try {
        const token = await SecureStore.getItemAsync(CHAVE_TOKEN);
        if (!token) return;

        definirToken(token);
        const guardado = await SecureStore.getItemAsync(CHAVE_PERFIL);
        if (guardado && montado.current) setPerfil(JSON.parse(guardado) as Perfil);

        // Confirma a sessão e já renova a janela de inatividade (RNF09).
        const { usuario } = await contaApi.obterPerfil();
        if (montado.current) {
          setPerfil(usuario);
          await SecureStore.setItemAsync(CHAVE_PERFIL, JSON.stringify(usuario));
        }
      } catch {
        await descartarSessao();
      } finally {
        if (montado.current) setRestaurando(false);
      }
    })();

    return () => {
      montado.current = false;
    };
  }, [descartarSessao]);

  // Qualquer 401 vindo da API derruba a sessão local.
  useEffect(() => {
    definirTratamentoDeSessaoExpirada(() => {
      void descartarSessao();
    });
    return () => definirTratamentoDeSessaoExpirada(null);
  }, [descartarSessao]);

  const valor = useMemo<ValorSessao>(
    () => ({
      restaurando,
      perfil,
      autenticado: perfil !== null,

      async entrar(email, senha) {
        const sessao = await contaApi.entrar(email, senha);
        await guardarSessao(sessao.token, sessao.usuario);
      },

      /** SD01 seguido de SD02: cadastrar já deixa o usuário dentro do app. */
      async cadastrar(nome, email, senha) {
        await contaApi.cadastrar({ nome, email, senha });
        const sessao = await contaApi.entrar(email, senha);
        await guardarSessao(sessao.token, sessao.usuario);
      },

      async sair() {
        // RN03 — o backend invalida o token; se a chamada falhar, a sessão
        // local cai do mesmo jeito.
        await contaApi.sair().catch(() => undefined);
        await descartarSessao();
      },

      definirPerfil: setPerfil,
    }),
    [restaurando, perfil, guardarSessao, descartarSessao],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): ValorSessao {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('useSessao precisa estar dentro de <SessaoProvider>.');
  }
  return valor;
}
