/**
 * RN08 — alerta de estoque configurável por item.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { estaEmAlerta, toProdutoView } from '../../src/models/despensa.js';
import type { Produto } from '../../src/models/despensa.js';

function produto(campos: Partial<Produto> = {}): Produto {
  return {
    id: 1,
    usuario_id: 1,
    nome: 'Arroz',
    categoria: 'Mantimentos',
    unidade: 'kg',
    quantidade_atual: 5,
    monitorado: false,
    quantidade_minima: null,
    criado_em: new Date('2026-08-01T12:00:00Z'),
    ...campos,
  };
}

describe('RN08 — estaEmAlerta', () => {
  it('item não monitorado nunca alerta, mesmo zerado', () => {
    assert.equal(estaEmAlerta(produto({ monitorado: false, quantidade_atual: 0 })), false);
  });

  it('alerta ao atingir exatamente a mínima', () => {
    assert.equal(
      estaEmAlerta(produto({ monitorado: true, quantidade_minima: 2, quantidade_atual: 2 })),
      true,
    );
  });

  it('alerta abaixo da mínima', () => {
    assert.equal(
      estaEmAlerta(produto({ monitorado: true, quantidade_minima: 2, quantidade_atual: 1.5 })),
      true,
    );
  });

  it('não alerta acima da mínima', () => {
    assert.equal(
      estaEmAlerta(produto({ monitorado: true, quantidade_minima: 2, quantidade_atual: 2.1 })),
      false,
    );
  });

  it('monitorado sem mínima definida não alerta — não há limite para comparar', () => {
    assert.equal(
      estaEmAlerta(produto({ monitorado: true, quantidade_minima: null, quantidade_atual: 0 })),
      false,
    );
  });
});

describe('toProdutoView', () => {
  it('converte para o formato do cliente já com o alerta resolvido', () => {
    const view = toProdutoView(
      produto({ monitorado: true, quantidade_minima: 3, quantidade_atual: 3 }),
    );

    assert.deepEqual(view, {
      id: 1,
      nome: 'Arroz',
      categoria: 'Mantimentos',
      unidade: 'kg',
      quantidadeAtual: 3,
      monitorado: true,
      quantidadeMinima: 3,
      emAlerta: true,
      criadoEm: new Date('2026-08-01T12:00:00Z'),
    });
  });

  it('não vaza o dono do produto', () => {
    assert.equal('usuario_id' in toProdutoView(produto()), false);
  });
});
