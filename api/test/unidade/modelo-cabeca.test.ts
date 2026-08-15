/**
 * RN15 (média pelo método escolhido), RN16 (progressão das notas) e RF028
 * (estatísticas de estudo).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calcularEstatisticas,
  calcularMedia,
  calcularProgressao,
} from '../../src/models/cabeca.js';

function nota(valor: number, peso = 1, data = '2026-08-01', descricao = 'Prova') {
  return { valor, peso, data, descricao };
}

describe('RN15 — calcularMedia', () => {
  it('sem avaliações não existe média — devolve null, não zero', () => {
    assert.equal(calcularMedia([], 'simples'), null);
    assert.equal(calcularMedia([], 'ponderada'), null);
  });

  it('na simples todas as notas pesam igual, mesmo com peso registrado', () => {
    assert.equal(calcularMedia([nota(10, 1), nota(6, 3)], 'simples'), 8);
  });

  it('na ponderada cada nota pesa o que o usuário definiu', () => {
    assert.equal(calcularMedia([nota(10, 1), nota(6, 3)], 'ponderada'), 7);
  });

  it('a ponderada com pesos iguais coincide com a simples', () => {
    const avaliacoes = [nota(7), nota(8), nota(9)];

    assert.equal(calcularMedia(avaliacoes, 'ponderada'), calcularMedia(avaliacoes, 'simples'));
  });

  it('arredonda a duas casas', () => {
    assert.equal(calcularMedia([nota(7), nota(8), nota(8)], 'simples'), 7.67);
  });

  it('uma nota zero é média zero — e não "sem nota"', () => {
    assert.equal(calcularMedia([nota(0)], 'simples'), 0);
  });
});

describe('RN16 — calcularProgressao', () => {
  it('sem avaliações a tendência fica indefinida', () => {
    const progressao = calcularProgressao([], 'simples');

    assert.deepEqual(progressao, {
      pontos: [],
      primeira: null,
      ultima: null,
      variacao: null,
      tendencia: 'indefinida',
    });
  });

  it('com uma única nota não há o que comparar', () => {
    const progressao = calcularProgressao([nota(7)], 'simples');

    assert.equal(progressao.tendencia, 'indefinida');
    assert.equal(progressao.primeira, 7);
    assert.equal(progressao.ultima, 7);
    assert.equal(progressao.variacao, 0);
  });

  it('notas em alta apontam para cima', () => {
    const progressao = calcularProgressao(
      [nota(5), nota(6), nota(8), nota(9)],
      'simples',
    );

    assert.equal(progressao.tendencia, 'subindo');
    assert.equal(progressao.variacao, 4);
    assert.equal(progressao.primeira, 5);
    assert.equal(progressao.ultima, 9);
  });

  it('notas em queda apontam para baixo', () => {
    const progressao = calcularProgressao([nota(9), nota(8), nota(6), nota(5)], 'simples');

    assert.equal(progressao.tendencia, 'caindo');
    assert.equal(progressao.variacao, -4);
  });

  it('oscilação pequena é estabilidade, não tendência', () => {
    const progressao = calcularProgressao(
      [nota(7), nota(7.1), nota(7.2), nota(7.05)],
      'simples',
    );

    assert.equal(progressao.tendencia, 'estavel');
  });

  it('cada ponto traz a média até ali', () => {
    const progressao = calcularProgressao([nota(5), nota(6), nota(8), nota(9)], 'simples');

    assert.deepEqual(
      progressao.pontos.map((ponto) => ponto.mediaAcumulada),
      [5, 5.5, 6.33, 7],
    );
  });

  it('a média acumulada respeita o método ponderado', () => {
    const progressao = calcularProgressao([nota(10, 1), nota(6, 3)], 'ponderada');

    assert.deepEqual(
      progressao.pontos.map((ponto) => ponto.mediaAcumulada),
      [10, 7],
    );
  });
});

describe('RF028 — calcularEstatisticas', () => {
  it('sem sessões devolve tudo zerado', () => {
    assert.deepEqual(calcularEstatisticas([]), {
      totalSessoes: 0,
      totalMinutos: 0,
      mediaMinutosPorSessao: 0,
      maiorSessaoMin: 0,
      ultimaSessao: null,
      porMes: [],
    });
  });

  it('soma o tempo, acha a maior sessão e agrupa por mês', () => {
    const estatisticas = calcularEstatisticas([
      { data: '2026-07-10', duracao_min: 60 },
      { data: '2026-08-01', duracao_min: 90 },
      { data: '2026-08-05', duracao_min: 30 },
    ]);

    assert.equal(estatisticas.totalSessoes, 3);
    assert.equal(estatisticas.totalMinutos, 180);
    assert.equal(estatisticas.mediaMinutosPorSessao, 60);
    assert.equal(estatisticas.maiorSessaoMin, 90);
    assert.equal(estatisticas.ultimaSessao, '2026-08-05');
    assert.deepEqual(estatisticas.porMes, [
      { mes: '2026-07', minutos: 60, sessoes: 1 },
      { mes: '2026-08', minutos: 120, sessoes: 2 },
    ]);
  });

  it('acha a última sessão mesmo com as datas fora de ordem', () => {
    const estatisticas = calcularEstatisticas([
      { data: '2026-08-05', duracao_min: 30 },
      { data: '2026-07-10', duracao_min: 60 },
    ]);

    assert.equal(estatisticas.ultimaSessao, '2026-08-05');
  });
});
