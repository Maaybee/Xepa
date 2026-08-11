/**
 * Cliente HTTP dos testes de integração.
 *
 * Sobe o app Express de verdade numa porta efêmera e conversa com ele por
 * `fetch` — os testes atravessam a pilha inteira (rota → middleware →
 * controller → service → repository → banco), que é onde as RNs de fato
 * aparecem.
 *
 * O app é importado dinamicamente para que o mock do pool (`apoio/banco.ts`)
 * já esteja instalado quando `src/` for carregado.
 */

import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

export interface Resposta<T = any> {
  status: number;
  corpo: T;
}

export interface Cliente {
  get<T = any>(caminho: string): Promise<Resposta<T>>;
  post<T = any>(caminho: string, corpo?: unknown): Promise<Resposta<T>>;
  put<T = any>(caminho: string, corpo?: unknown): Promise<Resposta<T>>;
  delete<T = any>(caminho: string): Promise<Resposta<T>>;
  /** Deriva um cliente que manda `Authorization: Bearer <token>`. */
  comToken(token: string): Cliente;
}

export interface Api {
  cliente: Cliente;
  encerrar(): Promise<void>;
}

/** Sobe a API numa porta efêmera. Chame uma vez por arquivo de teste. */
export async function subirApi(): Promise<Api> {
  const { createApp } = await import('../../src/app.js');

  const servidor: Server = createApp().listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const { port } = servidor.address() as AddressInfo;

  return {
    cliente: criarCliente(`http://127.0.0.1:${port}/api`, null),
    encerrar: async () => {
      servidor.close();
      await once(servidor, 'close');
    },
  };
}

function criarCliente(base: string, token: string | null): Cliente {
  async function requisitar<T>(
    metodo: string,
    caminho: string,
    corpo?: unknown,
  ): Promise<Resposta<T>> {
    const resposta = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
    });

    const texto = await resposta.text();
    return {
      status: resposta.status,
      corpo: (texto ? JSON.parse(texto) : null) as T,
    };
  }

  return {
    get: (caminho) => requisitar('GET', caminho),
    post: (caminho, corpo) => requisitar('POST', caminho, corpo),
    put: (caminho, corpo) => requisitar('PUT', caminho, corpo),
    delete: (caminho) => requisitar('DELETE', caminho),
    comToken: (novoToken) => criarCliente(base, novoToken),
  };
}
