/**
 * SD17 — importação de notas da instituição (RF023, RN05), caminho feliz.
 *
 * Arquivo separado porque `INSTITUICAO_INTEGRACAO` é lido uma vez, na carga de
 * `config/env.ts`: aqui a integração nasce ligada no modo `stub`, enquanto
 * `cabeca.test.ts` roda com ela desligada, que é o normal em produção.
 */

process.env.INSTITUICAO_INTEGRACAO = 'stub';

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

/** RN05 — a importação depende de vínculo institucional ativo. */
async function vincularInstituicao() {
  const { corpo } = await conta.cliente.get('/conta/instituicoes');
  await conta.cliente.put('/conta/perfil', { instituicaoId: corpo.instituicoes[0].id });
  return corpo.instituicoes[0].nome;
}

describe('SD17 — importar notas com integração disponível', () => {
  it('cria as matérias que faltam e traz as notas como importadas', async () => {
    const instituicao = await vincularInstituicao();

    const resposta = await conta.cliente.post('/cabeca/importar');

    assert.equal(resposta.status, 200);
    assert.equal(resposta.corpo.instituicao, instituicao);
    assert.equal(resposta.corpo.importadas, 3);
    assert.equal(resposta.corpo.ignoradas, 0);
    assert.deepEqual(resposta.corpo.materiasCriadas, ['Cálculo I', 'Algoritmos']);

    const { rows } = await banco.query<{ origem: string }>('SELECT origem FROM avaliacao');
    assert.deepEqual(rows, [{ origem: 'importada' }, { origem: 'importada' }, { origem: 'importada' }]);
  });

  it('reimportar não duplica: as notas já importadas são ignoradas', async () => {
    await vincularInstituicao();
    await conta.cliente.post('/cabeca/importar');

    const segunda = await conta.cliente.post('/cabeca/importar');

    assert.equal(segunda.corpo.importadas, 0);
    assert.equal(segunda.corpo.ignoradas, 3);
    assert.deepEqual(segunda.corpo.materiasCriadas, []);

    const { rowCount } = await banco.query('SELECT 1 FROM avaliacao');
    assert.equal(rowCount, 3);
  });

  it('aproveita a matéria que o usuário já tinha cadastrado', async () => {
    await vincularInstituicao();
    await conta.cliente.post('/cabeca/materias', { nome: 'Cálculo I', metodoMedia: 'ponderada' });

    const resposta = await conta.cliente.post('/cabeca/importar');

    assert.deepEqual(resposta.corpo.materiasCriadas, ['Algoritmos']);
    const { rowCount } = await banco.query('SELECT 1 FROM materia');
    assert.equal(rowCount, 2);
  });

  it('as notas importadas entram no cálculo da média (RN15)', async () => {
    await vincularInstituicao();
    await conta.cliente.post('/cabeca/importar');

    const { corpo } = await conta.cliente.get('/cabeca/materias');
    const calculo = corpo.materias.find((m: { nome: string }) => m.nome === 'Cálculo I');

    assert.equal(calculo.totalAvaliacoes, 2);
    assert.equal(calculo.media, 8, 'média simples de 7,5 e 8,5');
  });

  it('RN05 — sem vínculo continua recusando, mesmo com a integração ligada', async () => {
    const resposta = await conta.cliente.post('/cabeca/importar');

    assert.equal(resposta.status, 422);
  });
});
