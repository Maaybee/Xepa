/**
 * Módulo 4 — Cabeça (SD16, SD18–SD20) e a recusa da importação (SD17).
 *
 * Cobre RF022, RF024–RF028 e as regras RN15 (média pelo método escolhido) e
 * RN16 (progressão das notas). O caminho feliz do SD17 fica em
 * `cabeca-importacao.test.ts`, que precisa da integração ligada.
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

async function criarMateria(nome = 'Cálculo I', metodoMedia?: 'simples' | 'ponderada') {
  const resposta = await conta.cliente.post('/cabeca/materias', {
    nome,
    ...(metodoMedia ? { metodoMedia } : {}),
  });
  assert.equal(resposta.status, 201, JSON.stringify(resposta.corpo));
  return resposta.corpo.materia;
}

async function registrarNota(
  materiaId: number,
  valor: number,
  extras: Record<string, unknown> = {},
) {
  const resposta = await conta.cliente.post(`/cabeca/materias/${materiaId}/avaliacoes`, {
    descricao: 'Prova',
    data: '2026-08-01',
    valor,
    ...extras,
  });
  assert.equal(resposta.status, 201, JSON.stringify(resposta.corpo));
  return resposta.corpo.avaliacao;
}

describe('SD16 — matérias (RF022, RN15)', () => {
  it('cadastra com média simples por padrão e sem nota nenhuma', async () => {
    const materia = await criarMateria();

    assert.equal(materia.metodoMedia, 'simples');
    assert.equal(materia.media, null, 'sem avaliação não existe média');
    assert.equal(materia.totalAvaliacoes, 0);
    assert.equal(materia.totalMinutosEstudo, 0);
  });

  it('aceita o método ponderado quando o usuário escolhe', async () => {
    const materia = await criarMateria('Algoritmos', 'ponderada');

    assert.equal(materia.metodoMedia, 'ponderada');
  });

  it('recusa matéria repetida', async () => {
    await criarMateria();

    const repetida = await conta.cliente.post('/cabeca/materias', { nome: 'Cálculo I' });

    assert.equal(repetida.status, 409);
  });

  it('recusa método de média desconhecido', async () => {
    const resposta = await conta.cliente.post('/cabeca/materias', {
      nome: 'Física',
      metodoMedia: 'harmonica',
    });

    assert.equal(resposta.status, 400);
  });

  it('RN15 — trocar o método recalcula a média na hora', async () => {
    const materia = await criarMateria('Cálculo I', 'simples');
    await registrarNota(materia.id, 10, { peso: 1 });
    await registrarNota(materia.id, 6, { peso: 3 });

    const simples = await conta.cliente.get('/cabeca/materias');
    assert.equal(simples.corpo.materias[0].media, 8);

    const trocada = await conta.cliente.put(`/cabeca/materias/${materia.id}`, {
      metodoMedia: 'ponderada',
    });

    assert.equal(trocada.corpo.materia.media, 7);
    assert.equal(trocada.corpo.materia.totalAvaliacoes, 2);
  });

  it('recusa renomear para o nome de outra matéria', async () => {
    await criarMateria('Cálculo I');
    const algoritmos = await criarMateria('Algoritmos');

    const resposta = await conta.cliente.put(`/cabeca/materias/${algoritmos.id}`, {
      nome: 'Cálculo I',
    });

    assert.equal(resposta.status, 409);
  });
});

describe('SD18 — notas manuais (RF024)', () => {
  it('registra a nota com origem manual e peso 1 por padrão', async () => {
    const materia = await criarMateria();

    const avaliacao = await registrarNota(materia.id, 7.5);

    assert.equal(avaliacao.origem, 'manual');
    assert.equal(avaliacao.peso, 1);
    assert.equal(avaliacao.valor, 7.5);
    assert.equal(avaliacao.data, '2026-08-01');
  });

  it('lista as avaliações da matéria', async () => {
    const materia = await criarMateria();
    await registrarNota(materia.id, 7, { descricao: 'P1', data: '2026-04-10' });
    await registrarNota(materia.id, 9, { descricao: 'P2', data: '2026-06-10' });

    const { corpo } = await conta.cliente.get(`/cabeca/materias/${materia.id}/avaliacoes`);

    assert.deepEqual(
      corpo.avaliacoes.map((a: { descricao: string }) => a.descricao),
      ['P1', 'P2'],
    );
  });

  it('remove a avaliação e recalcula a média', async () => {
    const materia = await criarMateria();
    const primeira = await registrarNota(materia.id, 4);
    await registrarNota(materia.id, 8);

    assert.equal((await conta.cliente.delete(`/cabeca/avaliacoes/${primeira.id}`)).status, 204);

    const { corpo } = await conta.cliente.get('/cabeca/materias');
    assert.equal(corpo.materias[0].media, 8);
  });

  it('não remove avaliação de outra conta', async () => {
    const materia = await criarMateria();
    const avaliacao = await registrarNota(materia.id, 7);
    const outra = await criarConta(api.cliente, 'Bruno');

    const resposta = await outra.cliente.delete(`/cabeca/avaliacoes/${avaliacao.id}`);

    assert.equal(resposta.status, 404);
  });

  it('recusa nota negativa e peso zero', async () => {
    const materia = await criarMateria();

    const negativa = await conta.cliente.post(`/cabeca/materias/${materia.id}/avaliacoes`, {
      descricao: 'P1',
      valor: -1,
      data: '2026-08-01',
    });
    const semPeso = await conta.cliente.post(`/cabeca/materias/${materia.id}/avaliacoes`, {
      descricao: 'P1',
      valor: 5,
      peso: 0,
      data: '2026-08-01',
    });

    assert.equal(negativa.status, 400);
    assert.equal(semPeso.status, 400);
  });

  it('recusa nota em matéria inexistente', async () => {
    const resposta = await conta.cliente.post('/cabeca/materias/9999/avaliacoes', {
      descricao: 'P1',
      valor: 5,
      data: '2026-08-01',
    });

    assert.equal(resposta.status, 404);
  });
});

describe('SD19 — sessões de estudo (RF025)', () => {
  it('registra a sessão e soma no total da matéria', async () => {
    const materia = await criarMateria();

    const resposta = await conta.cliente.post(`/cabeca/materias/${materia.id}/sessoes`, {
      data: '2026-08-01',
      duracaoMin: 90,
    });

    assert.equal(resposta.status, 201);
    assert.equal(resposta.corpo.sessao.duracaoMin, 90);

    const { corpo } = await conta.cliente.get('/cabeca/materias');
    assert.equal(corpo.materias[0].totalMinutosEstudo, 90);
  });

  it('recusa duração zero, fracionada ou maior que um dia', async () => {
    const materia = await criarMateria();

    for (const duracaoMin of [0, 30.5, 24 * 60 + 1]) {
      const resposta = await conta.cliente.post(`/cabeca/materias/${materia.id}/sessoes`, {
        data: '2026-08-01',
        duracaoMin,
      });
      assert.equal(resposta.status, 400, `duração ${duracaoMin} deveria ser recusada`);
    }
  });
});

describe('SD20 — desempenho (RF026, RF027, RF028, RN15, RN16)', () => {
  it('RN16 — mostra a progressão das notas ao longo do tempo', async () => {
    const materia = await criarMateria();
    await registrarNota(materia.id, 5, { descricao: 'P1', data: '2026-03-10' });
    await registrarNota(materia.id, 6, { descricao: 'P2', data: '2026-04-10' });
    await registrarNota(materia.id, 8, { descricao: 'P3', data: '2026-05-10' });
    await registrarNota(materia.id, 9, { descricao: 'P4', data: '2026-06-10' });

    const { corpo } = await conta.cliente.get(`/cabeca/materias/${materia.id}/desempenho`);

    assert.equal(corpo.media, 7);
    assert.equal(corpo.progressao.tendencia, 'subindo');
    assert.equal(corpo.progressao.primeira, 5);
    assert.equal(corpo.progressao.ultima, 9);
    assert.equal(corpo.progressao.variacao, 4);
    assert.deepEqual(
      corpo.progressao.pontos.map((ponto: { descricao: string }) => ponto.descricao),
      ['P1', 'P2', 'P3', 'P4'],
    );
  });

  it('RF028 — junta as estatísticas de estudo da matéria', async () => {
    const materia = await criarMateria();
    await conta.cliente.post(`/cabeca/materias/${materia.id}/sessoes`, {
      data: '2026-07-10',
      duracaoMin: 60,
    });
    await conta.cliente.post(`/cabeca/materias/${materia.id}/sessoes`, {
      data: '2026-08-01',
      duracaoMin: 120,
    });

    const { corpo } = await conta.cliente.get(`/cabeca/materias/${materia.id}/desempenho`);

    assert.equal(corpo.estudo.totalSessoes, 2);
    assert.equal(corpo.estudo.totalMinutos, 180);
    assert.equal(corpo.estudo.mediaMinutosPorSessao, 90);
    assert.equal(corpo.estudo.ultimaSessao, '2026-08-01');
    assert.deepEqual(corpo.estudo.porMes, [
      { mes: '2026-07', minutos: 60, sessoes: 1 },
      { mes: '2026-08', minutos: 120, sessoes: 1 },
    ]);
  });

  it('matéria sem nada devolve média nula e tendência indefinida', async () => {
    const materia = await criarMateria();

    const { corpo } = await conta.cliente.get(`/cabeca/materias/${materia.id}/desempenho`);

    assert.equal(corpo.media, null);
    assert.equal(corpo.progressao.tendencia, 'indefinida');
    assert.equal(corpo.estudo.totalSessoes, 0);
  });

  it('RF026/RF028 — o panorama junta todas as matérias', async () => {
    const calculo = await criarMateria('Cálculo I');
    const algoritmos = await criarMateria('Algoritmos');
    await registrarNota(calculo.id, 6);
    await registrarNota(algoritmos.id, 8);
    await conta.cliente.post(`/cabeca/materias/${calculo.id}/sessoes`, {
      data: '2026-08-01',
      duracaoMin: 100,
    });
    await conta.cliente.post(`/cabeca/materias/${algoritmos.id}/sessoes`, {
      data: '2026-08-02',
      duracaoMin: 50,
    });

    const { corpo } = await conta.cliente.get('/cabeca/desempenho');

    assert.equal(corpo.mediaGeral, 7);
    assert.equal(corpo.estudo.totalMinutos, 150);
    assert.deepEqual(corpo.estudoPorMateria, [
      { materia: 'Cálculo I', minutos: 100, sessoes: 1 },
      { materia: 'Algoritmos', minutos: 50, sessoes: 1 },
    ]);
  });

  it('a média geral considera só as matérias que já têm nota', async () => {
    const calculo = await criarMateria('Cálculo I');
    await criarMateria('Algoritmos');
    await registrarNota(calculo.id, 6);

    const { corpo } = await conta.cliente.get('/cabeca/desempenho');

    assert.equal(corpo.mediaGeral, 6);
  });

  it('sem matéria nenhuma a média geral é nula', async () => {
    const { corpo } = await conta.cliente.get('/cabeca/desempenho');

    assert.equal(corpo.mediaGeral, null);
    assert.deepEqual(corpo.materias, []);
  });
});

describe('SD17 — importação de notas (RF023, RN05)', () => {
  it('RN05 — sem vínculo institucional a importação nem começa', async () => {
    const resposta = await conta.cliente.post('/cabeca/importar');

    assert.equal(resposta.status, 422);
    assert.match(resposta.corpo.erro.mensagem, /instituição/i);
  });

  it('com vínculo, mas sem integração publicada, avisa que é caso de registro manual', async () => {
    const instituicoes = await conta.cliente.get('/conta/instituicoes');
    await conta.cliente.put('/conta/perfil', {
      instituicaoId: instituicoes.corpo.instituicoes[0].id,
    });

    const resposta = await conta.cliente.post('/cabeca/importar');

    assert.equal(resposta.status, 503);
    assert.equal(resposta.corpo.erro.codigo, 'INTEGRACAO_INDISPONIVEL');
    assert.match(resposta.corpo.erro.mensagem, /manualmente/i);
  });
});

describe('isolamento entre contas', () => {
  it('as matérias de um usuário não aparecem para o outro', async () => {
    const materia = await criarMateria();
    const outra = await criarConta(api.cliente, 'Bruno');

    const lista = await outra.cliente.get('/cabeca/materias');
    assert.deepEqual(lista.corpo.materias, []);

    const desempenho = await outra.cliente.get(`/cabeca/materias/${materia.id}/desempenho`);
    assert.equal(desempenho.status, 404);
  });

  it('exige sessão', async () => {
    assert.equal((await api.cliente.get('/cabeca/materias')).status, 401);
  });
});
