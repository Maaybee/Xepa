/**
 * Módulo 3 — Grana (SD11–SD15).
 *
 * Cobre RF014, RF015, RF017–RF021 e as regras RN09 (lançamento automático
 * exige conta), RN10 (saldo = inicial + entradas − saídas), RN11 (o gasto do
 * mês sai só de TRANSACAO), RN12 (alerta em 80% do orçamento) e RN17 (um
 * orçamento por categoria e mês).
 */

import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prepararBanco } from '../apoio/banco.js';
import { subirApi } from '../apoio/http.js';
import { criarConta, reiniciarContador } from '../apoio/conta.js';
import type { ContaDeTeste } from '../apoio/conta.js';

const banco = await prepararBanco();
const api = await subirApi();

after(() => api.encerrar());

let conta: ContaDeTeste;
/** Id da categoria "Mercado", criada junto com a conta (RN18). */
let mercado: number;

beforeEach(async () => {
  await banco.limpar();
  reiniciarContador();
  conta = await criarConta(api.cliente);
  mercado = await idDaCategoria('Mercado');
});

async function idDaCategoria(nome: string): Promise<number> {
  const { corpo } = await conta.cliente.get('/grana/categorias');
  const categoria = corpo.categorias.find((c: { nome: string }) => c.nome === nome);
  assert.ok(categoria, `categoria "${nome}" deveria existir`);
  return categoria.id;
}

async function cadastrarConta(nomeBanco = 'Banco do Brasil', saldoInicial = 0) {
  const resposta = await conta.cliente.post('/grana/contas', { nomeBanco, saldoInicial });
  assert.equal(resposta.status, 201, JSON.stringify(resposta.corpo));
  return resposta.corpo.conta;
}

async function lancar(dados: Record<string, unknown>) {
  return conta.cliente.post('/grana/transacoes', {
    tipo: 'saida',
    data: '2026-08-10',
    ...dados,
  });
}

describe('SD11 — contas bancárias (RF014, RF019, RN10)', () => {
  it('cadastra a conta com o saldo inicial informado', async () => {
    const bancaria = await cadastrarConta('Nubank', 250.75);

    assert.equal(bancaria.nomeBanco, 'Nubank');
    assert.equal(bancaria.saldoInicial, 250.75);
    assert.equal(bancaria.saldo, 250.75);
    assert.equal(bancaria.entradas, 0);
  });

  it('recusa duas contas com o mesmo nome', async () => {
    await cadastrarConta('Nubank');

    const repetida = await conta.cliente.post('/grana/contas', { nomeBanco: 'Nubank' });

    assert.equal(repetida.status, 409);
  });

  it('RN10 — o saldo é o inicial mais as entradas menos as saídas', async () => {
    const bancaria = await cadastrarConta('Nubank', 1000);
    await lancar({ tipo: 'entrada', valor: 500, contaId: bancaria.id });
    await lancar({ tipo: 'saida', valor: 120.5, contaId: bancaria.id });

    const { corpo } = await conta.cliente.get('/grana/contas');

    assert.deepEqual(corpo.contas[0], {
      id: bancaria.id,
      nomeBanco: 'Nubank',
      saldoInicial: 1000,
      entradas: 500,
      saidas: 120.5,
      saldo: 1379.5,
    });
  });

  it('despesa sem conta (dinheiro vivo) não mexe no saldo de conta nenhuma', async () => {
    const bancaria = await cadastrarConta('Nubank', 100);
    await lancar({ valor: 30 });

    const { corpo } = await conta.cliente.get('/grana/contas');

    assert.equal(corpo.contas[0].saldo, 100);
    assert.equal(corpo.contas[0].id, bancaria.id);
  });
});

describe('SD13 — registro manual (RF017)', () => {
  it('registra a despesa e devolve a transação com origem manual', async () => {
    const resposta = await lancar({ valor: 42.5, categoriaId: mercado, descricao: 'Feira' });

    assert.equal(resposta.status, 201);
    assert.equal(resposta.corpo.transacao.origem, 'manual');
    assert.equal(resposta.corpo.transacao.valor, 42.5);
    assert.equal(resposta.corpo.transacao.data, '2026-08-10');
    assert.deepEqual(resposta.corpo.transacao.categoria, { id: mercado, nome: 'Mercado' });
    assert.equal(resposta.corpo.transacao.conta, null);
  });

  it('devolve o saldo da conta já atualizado', async () => {
    const bancaria = await cadastrarConta('Nubank', 100);

    const resposta = await lancar({ valor: 30, contaId: bancaria.id });

    assert.equal(resposta.corpo.saldoConta.saldo, 70);
  });

  it('recusa categoria que não é do usuário', async () => {
    const outra = await criarConta(api.cliente, 'Bruno');
    const { corpo } = await outra.cliente.get('/grana/categorias');

    const resposta = await lancar({ valor: 10, categoriaId: corpo.categorias[0].id });

    assert.equal(resposta.status, 400);
    assert.match(resposta.corpo.erro.mensagem, /categoria/i);
  });

  it('recusa conta que não é do usuário', async () => {
    const outra = await criarConta(api.cliente, 'Bruno');
    const alheia = await outra.cliente.post('/grana/contas', { nomeBanco: 'Itaú' });

    const resposta = await lancar({ valor: 10, contaId: alheia.corpo.conta.id });

    assert.equal(resposta.status, 400);
    assert.match(resposta.corpo.erro.mensagem, /conta/i);
  });

  it('recusa valor zero, negativo e data fora do formato', async () => {
    assert.equal((await lancar({ valor: 0 })).status, 400);
    assert.equal((await lancar({ valor: -5 })).status, 400);
    assert.equal((await lancar({ valor: 10, data: '10/08/2026' })).status, 400);
  });
});

describe('SD12 — registro automático (RF015, RN09)', () => {
  it('RN09 — sem conta cadastrada o lançamento automático não entra', async () => {
    const resposta = await conta.cliente.post('/grana/transacoes/auto', {
      tipo: 'saida',
      valor: 50,
      data: '2026-08-10',
    });

    assert.equal(resposta.status, 422);
    assert.match(resposta.corpo.erro.mensagem, /RN09/);
  });

  it('RN09 — conta de outro usuário não serve', async () => {
    const outra = await criarConta(api.cliente, 'Bruno');
    const alheia = await outra.cliente.post('/grana/contas', { nomeBanco: 'Itaú' });

    const resposta = await conta.cliente.post('/grana/transacoes/auto', {
      tipo: 'saida',
      valor: 50,
      data: '2026-08-10',
      contaId: alheia.corpo.conta.id,
    });

    assert.equal(resposta.status, 422);
  });

  it('com conta vinculada, registra com origem automática', async () => {
    const bancaria = await cadastrarConta('Nubank', 200);

    const resposta = await conta.cliente.post('/grana/transacoes/auto', {
      tipo: 'saida',
      valor: 50,
      data: '2026-08-10',
      contaId: bancaria.id,
      descricao: 'Compra no débito',
    });

    assert.equal(resposta.status, 201);
    assert.equal(resposta.corpo.transacao.origem, 'automatica');
    assert.equal(resposta.corpo.saldoConta.saldo, 150);
  });
});

describe('SD15 — orçamento por categoria (RF020, RF021, RN17)', () => {
  async function definirOrcamento(valorLimite: number, categoriaId = mercado) {
    return conta.cliente.post('/grana/orcamentos', {
      categoriaId,
      mesReferencia: '2026-08',
      valorLimite,
    });
  }

  it('cria o orçamento do mês para a categoria', async () => {
    const resposta = await definirOrcamento(300);

    assert.equal(resposta.status, 201);
    assert.equal(resposta.corpo.orcamento.valorLimite, 300);
    assert.equal(resposta.corpo.orcamento.gasto, 0);
    assert.deepEqual(resposta.corpo.orcamento.categoria, { id: mercado, nome: 'Mercado' });
  });

  it('RN17 — redefinir o mês atualiza o orçamento em vez de criar outro', async () => {
    await definirOrcamento(300);

    const segunda = await definirOrcamento(400);

    assert.equal(segunda.status, 200, 'a segunda chamada atualiza, então não é 201');
    assert.equal(segunda.corpo.orcamento.valorLimite, 400);

    const { rowCount } = await banco.query('SELECT 1 FROM orcamento');
    assert.equal(rowCount, 1);
  });

  it('categorias diferentes têm orçamentos independentes no mesmo mês', async () => {
    await definirOrcamento(300);
    await definirOrcamento(200, await idDaCategoria('Lazer'));

    const { rowCount } = await banco.query('SELECT 1 FROM orcamento');
    assert.equal(rowCount, 2);
  });

  it('RF021 — a lista do mês mostra quanto de cada orçamento já foi gasto', async () => {
    await definirOrcamento(300);
    await lancar({ valor: 90, categoriaId: mercado });

    const resposta = await conta.cliente.get('/grana/orcamentos?mes=2026-08');

    assert.equal(resposta.corpo.mesReferencia, '2026-08');
    assert.equal(resposta.corpo.orcamentos[0].gasto, 90);
    assert.equal(resposta.corpo.orcamentos[0].restante, 210);
    assert.equal(resposta.corpo.orcamentos[0].percentual, 30);
    assert.equal(resposta.corpo.orcamentos[0].emAlerta, false);
  });

  it('o orçamento de um mês não conta o gasto de outro', async () => {
    await definirOrcamento(300);
    await lancar({ valor: 90, categoriaId: mercado, data: '2026-07-31' });

    const resposta = await conta.cliente.get('/grana/orcamentos?mes=2026-08');

    assert.equal(resposta.corpo.orcamentos[0].gasto, 0);
  });

  it('recusa categoria inválida e mês fora do formato', async () => {
    assert.equal((await definirOrcamento(300, 9999)).status, 400);
    assert.equal(
      (
        await conta.cliente.post('/grana/orcamentos', {
          categoriaId: mercado,
          mesReferencia: '2026-13',
          valorLimite: 300,
        })
      ).status,
      400,
    );
  });

  it('remove o orçamento e não deixa remover de novo', async () => {
    const criado = await definirOrcamento(300);

    assert.equal((await conta.cliente.delete(`/grana/orcamentos/${criado.corpo.orcamento.id}`)).status, 204);
    assert.equal((await conta.cliente.delete(`/grana/orcamentos/${criado.corpo.orcamento.id}`)).status, 404);
  });
});

describe('RN12 — alerta de orçamento em 80%', () => {
  beforeEach(async () => {
    await conta.cliente.post('/grana/orcamentos', {
      categoriaId: mercado,
      mesReferencia: '2026-08',
      valorLimite: 100,
    });
  });

  it('abaixo de 80% não avisa nada', async () => {
    const resposta = await lancar({ valor: 79.99, categoriaId: mercado });

    assert.equal(resposta.corpo.alertaOrcamento, null);
  });

  it('ao cruzar os 80% avisa, somando o que já foi gasto no mês', async () => {
    await lancar({ valor: 60, categoriaId: mercado });

    const resposta = await lancar({ valor: 20, categoriaId: mercado });

    assert.equal(resposta.corpo.alertaOrcamento.percentual, 80);
    assert.equal(resposta.corpo.alertaOrcamento.gasto, 80);
    assert.equal(resposta.corpo.alertaOrcamento.estourado, false);
    assert.equal(resposta.corpo.alertaOrcamento.categoria, 'Mercado');
    assert.match(resposta.corpo.alertaOrcamento.mensagem, /80% do orçamento de Mercado/);
  });

  it('passar do limite marca estouro', async () => {
    const resposta = await lancar({ valor: 130, categoriaId: mercado });

    assert.equal(resposta.corpo.alertaOrcamento.estourado, true);
    assert.match(resposta.corpo.alertaOrcamento.mensagem, /estourou/i);
  });

  it('entrada não consome orçamento — ele é de gasto', async () => {
    const resposta = await lancar({ tipo: 'entrada', valor: 500, categoriaId: mercado });

    assert.equal(resposta.corpo.alertaOrcamento, null);
  });

  it('gasto em categoria sem orçamento não dispara alerta', async () => {
    const resposta = await lancar({ valor: 900, categoriaId: await idDaCategoria('Lazer') });

    assert.equal(resposta.corpo.alertaOrcamento, null);
  });

  it('gasto de outro mês não dispara o alerta deste', async () => {
    const resposta = await lancar({ valor: 90, categoriaId: mercado, data: '2026-09-01' });

    assert.equal(resposta.corpo.alertaOrcamento, null);
  });
});

describe('SD14 — resumo e extrato (RF018, RF019, RN11)', () => {
  beforeEach(async () => {
    await cadastrarConta('Nubank', 1000);
    await lancar({ tipo: 'entrada', valor: 2000, data: '2026-08-01', descricao: 'Bolsa' });
    await lancar({ valor: 300, categoriaId: mercado, data: '2026-08-05' });
    await lancar({ valor: 100, categoriaId: await idDaCategoria('Lazer'), data: '2026-08-06' });
    await lancar({ valor: 999, categoriaId: mercado, data: '2026-07-15' });
  });

  it('RN11 — soma entradas e saídas do mês pedido, ignorando os outros', async () => {
    const { corpo } = await conta.cliente.get('/grana/resumo?mes=2026-08');

    assert.deepEqual(corpo.periodo, { de: '2026-08-01', ate: '2026-08-31' });
    assert.equal(corpo.entradas, 2000);
    assert.equal(corpo.saidas, 400);
    assert.equal(corpo.resultado, 1600);
  });

  it('RF018 — quebra os gastos por categoria com o percentual de cada uma', async () => {
    const { corpo } = await conta.cliente.get('/grana/resumo?mes=2026-08');

    const porNome = new Map<string, { total: number; percentual: number }>(
      corpo.gastosPorCategoria.map((linha: any) => [linha.categoria?.nome, linha]),
    );
    assert.equal(porNome.get('Mercado')?.total, 300);
    assert.equal(porNome.get('Mercado')?.percentual, 75);
    assert.equal(porNome.get('Lazer')?.total, 100);
    assert.equal(porNome.get('Lazer')?.percentual, 25);
  });

  it('aceita intervalo livre de datas', async () => {
    const { corpo } = await conta.cliente.get('/grana/resumo?de=2026-07-01&ate=2026-07-31');

    assert.equal(corpo.saidas, 999);
    assert.equal(corpo.entradas, 0);
  });

  it('recusa intervalo com início depois do fim', async () => {
    const resposta = await conta.cliente.get('/grana/resumo?de=2026-08-31&ate=2026-08-01');

    assert.equal(resposta.status, 400);
  });

  it('o extrato filtra por tipo, categoria e período', async () => {
    const saidas = await conta.cliente.get('/grana/transacoes?mes=2026-08&tipo=saida');
    assert.equal(saidas.corpo.transacoes.length, 2);

    const doMercado = await conta.cliente.get(`/grana/transacoes?categoriaId=${mercado}`);
    assert.equal(doMercado.corpo.transacoes.length, 2, 'sem período, vê os dois meses');

    const limitado = await conta.cliente.get('/grana/transacoes?limite=1');
    assert.equal(limitado.corpo.transacoes.length, 1);
  });
});

describe('isolamento entre contas', () => {
  it('o resumo de um usuário não enxerga o gasto do outro', async () => {
    await lancar({ valor: 500, categoriaId: mercado });
    const outra = await criarConta(api.cliente, 'Bruno');

    const { corpo } = await outra.cliente.get('/grana/resumo?mes=2026-08');

    assert.equal(corpo.saidas, 0);
    assert.deepEqual(corpo.contas, []);
  });

  it('exige sessão', async () => {
    assert.equal((await api.cliente.get('/grana/resumo')).status, 401);
  });
});
