/**
 * Open Finance (SD25–SD27).
 *
 * Cobre RF034–RF037 e as regras que sustentam o módulo: RN19 (sincronização
 * idempotente), RN20 (a nota e o extrato são um gasto só) e RN21 (consentimento
 * expira, é revogável, e revogar não apaga histórico).
 *
 * A RN20 é a que mais importa: sem ela a RN11 (gasto do mês) conta o mesmo
 * dinheiro duas vezes assim que o usuário lê uma nota e conecta o banco.
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

beforeEach(async () => {
  await banco.limpar();
  reiniciarContador();
  conta = await criarConta(api.cliente);
});

/** Leva o consentimento até "ativo": criar → autorizar no banco → confirmar. */
async function conectar(instituicaoId = 'nubank') {
  const criacao = await conta.cliente.post('/grana/open-finance/consentimentos', {
    instituicaoId,
  });
  assert.equal(criacao.status, 201, JSON.stringify(criacao.corpo));
  const id = criacao.corpo.consentimento.id;

  const simulacao = await conta.cliente.post(
    `/grana/open-finance/consentimentos/${id}/simular-autorizacao`,
    {},
  );
  assert.equal(simulacao.status, 204, JSON.stringify(simulacao.corpo));

  const autorizacao = await conta.cliente.post(
    `/grana/open-finance/consentimentos/${id}/autorizar`,
    {},
  );
  assert.equal(autorizacao.status, 200, JSON.stringify(autorizacao.corpo));

  return { id, contas: autorizacao.corpo.contas as Array<{ id: number; nome_banco: string }> };
}

function sincronizar(id: number) {
  return conta.cliente.post(`/grana/open-finance/consentimentos/${id}/sincronizar`, {});
}

async function gastoDoMes(): Promise<number> {
  const { corpo } = await conta.cliente.get('/grana/resumo');
  return corpo.saidas;
}

describe('RF034 — conectar instituição', () => {
  it('lista as instituições disponíveis', async () => {
    const { status, corpo } = await conta.cliente.get('/grana/open-finance/instituicoes');
    assert.equal(status, 200);
    assert.ok(corpo.instituicoes.length > 0);
    assert.ok(corpo.instituicoes.every((i: { id: string; nome: string }) => i.id && i.nome));
  });

  it('nasce pendente e devolve a url de autorização', async () => {
    const { status, corpo } = await conta.cliente.post('/grana/open-finance/consentimentos', {
      instituicaoId: 'nubank',
    });
    assert.equal(status, 201);
    assert.equal(corpo.consentimento.status, 'pendente');
    assert.match(corpo.urlDeAutorizacao, /^https:\/\//);
  });

  it('RNF17 — não autoriza enquanto o usuário não passar pela instituição', async () => {
    const criacao = await conta.cliente.post('/grana/open-finance/consentimentos', {
      instituicaoId: 'itau',
    });
    const resposta = await conta.cliente.post(
      `/grana/open-finance/consentimentos/${criacao.corpo.consentimento.id}/autorizar`,
      {},
    );
    assert.equal(resposta.status, 409, 'consentimento não autorizado não pode destravar contas');
  });

  it('depois de autorizado, traz as contas e fica ativo', async () => {
    const { contas } = await conectar();
    assert.ok(contas.length > 0);

    const { corpo } = await conta.cliente.get('/grana/open-finance/conexoes');
    assert.equal(corpo.conexoes[0].status, 'ativo');
  });

  it('recusa instituição desconhecida', async () => {
    const { status } = await conta.cliente.post('/grana/open-finance/consentimentos', {
      instituicaoId: 'banco-que-nao-existe',
    });
    assert.equal(status, 404);
  });
});

describe('RF035 — sincronizar extrato', () => {
  it('importa a movimentação como transação', async () => {
    const { id } = await conectar();
    const { status, corpo } = await sincronizar(id);

    assert.equal(status, 200, JSON.stringify(corpo));
    assert.ok(corpo.resumo.importadas > 0);

    const { corpo: lista } = await conta.cliente.get('/grana/transacoes');
    assert.ok(
      lista.transacoes.some((t: { origem: string }) => t.origem === 'open_finance'),
      'deveria existir transação de origem open_finance',
    );
  });

  it('RN19 — sincronizar de novo não muda o gasto do mês', async () => {
    const { id } = await conectar();

    await sincronizar(id);
    const gastoDepoisDaPrimeira = await gastoDoMes();

    const segunda = await sincronizar(id);
    assert.equal(segunda.corpo.resumo.importadas, 0, 'nada novo na segunda passada');
    assert.ok(segunda.corpo.resumo.ignoradas > 0, 'as já importadas viram "ignoradas"');

    assert.equal(
      await gastoDoMes(),
      gastoDepoisDaPrimeira,
      'sincronizar duas vezes não pode inflar o gasto do mês (RN11)',
    );
  });
});

describe('RN20 — a nota e o extrato são um gasto só', () => {
  /**
   * Lê uma nota fiscal (RF008/RF016) cujo total bate com uma movimentação do
   * extrato. É o cenário exato da dupla contagem: o mesmo dinheiro chegando por
   * dois caminhos.
   *
   * A nota nasce **sem conta** — o QR Code não diz qual conta pagou —, e é por
   * isso que a conciliação não pode casar por conta.
   */
  async function lerNotaDe(valor: number, data: string) {
    const resposta = await conta.cliente.post('/despensa/notas', {
      chaveAcesso: '7'.repeat(44),
      localCompra: 'Mercado do Zé',
      dataCompra: data,
      itens: [{ descricao: 'Compra do mês', quantidade: 1, valorUnitario: valor }],
    });
    assert.equal(resposta.status, 201, JSON.stringify(resposta.corpo));
    return resposta.corpo;
  }

  /** Uma saída qualquer que o simulador vai devolver no extrato. */
  async function descobrirSaidaDoExtrato() {
    const { id } = await conectar();
    await sincronizar(id);
    const { corpo } = await conta.cliente.get('/grana/transacoes');
    const saida = corpo.transacoes.find(
      (t: { origem: string; tipo: string }) => t.origem === 'open_finance' && t.tipo === 'saida',
    );
    assert.ok(saida, 'o simulador precisa ter ao menos uma saída no extrato');
    return { valor: saida.valor as number, data: saida.data as string };
  }

  it('concilia em vez de criar uma segunda transação', async () => {
    const alvo = await descobrirSaidaDoExtrato();

    // Refaz o cenário na ordem que importa: a nota chega antes do extrato.
    await banco.limpar();
    reiniciarContador();
    conta = await criarConta(api.cliente);

    await lerNotaDe(alvo.valor, alvo.data);
    const gastoSoComNota = await gastoDoMes();
    assert.equal(gastoSoComNota, alvo.valor, 'a nota sozinha já conta como gasto');

    const { id } = await conectar();
    const resultado = await sincronizar(id);

    assert.equal(
      resultado.corpo.resumo.conciliadas,
      1,
      'a movimentação equivalente deveria conciliar, não importar',
    );

    const { corpo: depois } = await conta.cliente.get('/grana/transacoes');
    const equivalentes = depois.transacoes.filter(
      (t: { valor: number; data: string }) => t.valor === alvo.valor && t.data === alvo.data,
    );
    assert.equal(equivalentes.length, 1, 'o mesmo gasto não pode virar duas transações');
    assert.equal(equivalentes[0].origem, 'nota', 'a transação que sobrevive é a da nota');

    // O contraprova: o gasto do mês não pode ter somado o valor de novo.
    const gastoFinal = await gastoDoMes();
    assert.notEqual(
      gastoFinal,
      gastoSoComNota + alvo.valor,
      'dupla contagem: o valor da nota entrou duas vezes (RN11)',
    );
  });

  it('a conciliação descobre por qual conta a nota foi paga', async () => {
    const alvo = await descobrirSaidaDoExtrato();

    await banco.limpar();
    reiniciarContador();
    conta = await criarConta(api.cliente);

    await lerNotaDe(alvo.valor, alvo.data);
    const { rows: antes } = await banco.query<{ conta_id: number | null }>(
      "SELECT conta_id FROM transacao WHERE origem = 'nota'",
    );
    assert.equal(antes[0]?.conta_id, null, 'a nota nasce sem conta');

    const { id } = await conectar();
    await sincronizar(id);

    const { rows: depois } = await banco.query<{ conta_id: number | null }>(
      "SELECT conta_id FROM transacao WHERE origem = 'nota'",
    );
    assert.ok(depois[0]?.conta_id, 'depois de conciliar, a nota sabe a conta que pagou (RN10)');
  });

  it('RN19 + RN20 — sincronizar de novo não desfaz nem duplica a conciliação', async () => {
    const alvo = await descobrirSaidaDoExtrato();

    await banco.limpar();
    reiniciarContador();
    conta = await criarConta(api.cliente);

    await lerNotaDe(alvo.valor, alvo.data);
    const { id } = await conectar();
    await sincronizar(id);
    const gasto = await gastoDoMes();

    const segunda = await sincronizar(id);
    assert.equal(segunda.corpo.resumo.conciliadas, 0, 'não concilia de novo o que já conciliou');
    assert.equal(await gastoDoMes(), gasto, 'o gasto do mês fica estável (RN11)');
  });
});

describe('RF036/RN21 — revogar', () => {
  it('revoga e passa a recusar sincronização', async () => {
    const { id } = await conectar();
    await sincronizar(id);

    const revogacao = await conta.cliente.delete(`/grana/open-finance/consentimentos/${id}`);
    assert.equal(revogacao.status, 204);

    const { corpo } = await conta.cliente.get('/grana/open-finance/conexoes');
    assert.equal(corpo.conexoes[0].status, 'revogado');

    const depois = await sincronizar(id);
    assert.equal(depois.status, 409, 'consentimento revogado não sincroniza');
  });

  it('revogar não apaga as transações já importadas', async () => {
    const { id } = await conectar();
    await sincronizar(id);
    const gastoAntes = await gastoDoMes();

    await conta.cliente.delete(`/grana/open-finance/consentimentos/${id}`);

    assert.equal(
      await gastoDoMes(),
      gastoAntes,
      'o histórico financeiro do usuário permanece após a revogação',
    );
  });
});

describe('RF037 — o usuário vê o que consentiu', () => {
  it('expõe escopo e validade da conexão', async () => {
    const { id } = await conectar();
    const { corpo } = await conta.cliente.get('/grana/open-finance/conexoes');
    const conexao = corpo.conexoes.find((c: { id: number }) => c.id === id);

    assert.ok(conexao.escopo.length > 0, 'o escopo consentido fica visível');
    assert.ok(new Date(conexao.expiraEm) > new Date(), 'a validade é futura');

    // RN21 — o teto é de 12 meses.
    const dozeMeses = new Date();
    dozeMeses.setMonth(dozeMeses.getMonth() + 12);
    assert.ok(new Date(conexao.expiraEm) <= dozeMeses, 'a validade não passa de 12 meses');
  });
});
