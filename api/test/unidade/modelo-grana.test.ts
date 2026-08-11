/**
 * RN12 — o alerta de orçamento dispara ao atingir 80% do limite.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LIMIAR_ALERTA_ORCAMENTO,
  arredondar,
  montarOrcamentoView,
  toTransacaoView,
} from '../../src/models/grana.js';
import type { TransacaoComRelacionamentos } from '../../src/models/grana.js';

function orcamento(gasto: number, valorLimite = 300) {
  return montarOrcamentoView({
    id: 1,
    categoriaId: 2,
    categoriaNome: 'Mercado',
    mesReferencia: '2026-08',
    valorLimite,
    gasto,
  });
}

describe('RN12 — montarOrcamentoView', () => {
  it('o limiar do alerta é 80%', () => {
    assert.equal(LIMIAR_ALERTA_ORCAMENTO, 0.8);
  });

  it('não alerta logo abaixo de 80%', () => {
    const view = orcamento(239.99);

    assert.equal(view.emAlerta, false);
    assert.equal(view.estourado, false);
  });

  it('alerta exatamente em 80%', () => {
    const view = orcamento(240);

    assert.equal(view.emAlerta, true);
    assert.equal(view.percentual, 80);
    assert.equal(view.restante, 60);
  });

  it('no limite exato alerta, mas ainda não estourou', () => {
    const view = orcamento(300);

    assert.equal(view.emAlerta, true);
    assert.equal(view.estourado, false);
    assert.equal(view.restante, 0);
  });

  it('acima do limite marca estouro e mostra o restante negativo', () => {
    const view = orcamento(330);

    assert.equal(view.estourado, true);
    assert.equal(view.percentual, 110);
    assert.equal(view.restante, -30);
  });

  it('sem gasto nenhum fica zerado', () => {
    const view = orcamento(0);

    assert.equal(view.emAlerta, false);
    assert.equal(view.percentual, 0);
    assert.equal(view.gasto, 0);
  });

  it('arredonda o percentual a uma casa', () => {
    assert.equal(orcamento(100, 300).percentual, 33.3);
  });
});

describe('arredondar', () => {
  it('mantém duas casas — dinheiro não tem terceira', () => {
    assert.equal(arredondar(10.005), 10.01);
    assert.equal(arredondar(10.004), 10);
    assert.equal(arredondar(0.1 + 0.2), 0.3);
  });
});

describe('toTransacaoView', () => {
  function linha(campos: Partial<TransacaoComRelacionamentos> = {}): TransacaoComRelacionamentos {
    return {
      id: 1,
      usuario_id: 1,
      conta_id: null,
      categoria_id: null,
      nota_fiscal_id: null,
      tipo: 'saida',
      valor: 42.5,
      data: '2026-08-11',
      origem: 'manual',
      descricao: 'Feira',
      categoria_nome: null,
      conta_nome_banco: null,
      ...campos,
    };
  }

  it('despesa em dinheiro vivo vem sem conta e sem categoria', () => {
    const view = toTransacaoView(linha());

    assert.equal(view.conta, null);
    assert.equal(view.categoria, null);
    assert.equal(view.notaFiscalId, null);
  });

  it('aninha categoria e conta quando existem', () => {
    const view = toTransacaoView(
      linha({
        categoria_id: 2,
        categoria_nome: 'Mercado',
        conta_id: 3,
        conta_nome_banco: 'Banco do Brasil',
      }),
    );

    assert.deepEqual(view.categoria, { id: 2, nome: 'Mercado' });
    assert.deepEqual(view.conta, { id: 3, nomeBanco: 'Banco do Brasil' });
  });

  it('transação vinda de nota carrega a nota de origem', () => {
    const view = toTransacaoView(linha({ origem: 'nota', nota_fiscal_id: 7 }));

    assert.equal(view.origem, 'nota');
    assert.equal(view.notaFiscalId, 7);
  });

  it('não vaza o dono da transação', () => {
    assert.equal('usuario_id' in toTransacaoView(linha()), false);
  });
});
