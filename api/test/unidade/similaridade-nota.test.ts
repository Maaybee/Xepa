/**
 * RN22 — casamento entre a descrição da nota e o produto da despensa.
 *
 * As descrições daqui saíram de uma nota real (35260705002327000116…), com o
 * truncamento do PDV intacto: é ele que o casamento existe para vencer.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  semelhanca,
  semelhancaDeToken,
  sugerirProduto,
  tokens,
} from '../../src/services/notaFiscal/similaridade.js';

/** A despensa de quem já usa o app há algumas compras. */
const DESPENSA = [
  { id: 1, nome: 'maionese' },
  { id: 2, nome: 'papel higiênico' },
  { id: 3, nome: 'macarrão instantâneo' },
  { id: 4, nome: 'sal' },
  { id: 5, nome: 'chá mate' },
  { id: 6, nome: 'arroz' },
];

describe('RN22 — o que sobra da descrição depois da limpeza', () => {
  test('medida e embalagem saem, porque não descrevem o produto', () => {
    assert.deepEqual(tokens('MAION HELLMANNS 500G TRA'), ['maion', 'hellmanns', 'tra']);
    assert.deepEqual(tokens('TORRADA BAUDUCCO 142G TR'), ['torrada', 'bauducco', 'tr']);
  });

  test('acento do produto não separa do que vem sem acento na nota', () => {
    assert.deepEqual(tokens('macarrão instantâneo'), ['macarrao', 'instantaneo']);
  });
});

describe('RN22 — semelhança entre dois tokens', () => {
  test('truncamento do PDV é o caso forte: um é começo do outro', () => {
    assert.equal(semelhancaDeToken('higienico', 'hig'), 0.9);
    assert.equal(semelhancaDeToken('instantaneo', 'inst'), 0.9);
    assert.equal(semelhancaDeToken('maionese', 'maion'), 0.9);
  });

  test('começo igual que depois diverge vale menos que truncamento', () => {
    // Pode ser outro produto: macarronada não é macarrão.
    assert.equal(semelhancaDeToken('macarrao', 'macarronada'), 0.6);
  });

  test('duas letras em comum não são parentesco', () => {
    // O caso que motivou o prefixo mínimo de 3.
    assert.equal(semelhancaDeToken('sal', 'sacola'), 0);
    assert.equal(semelhancaDeToken('cha', 'chantilly'), 0);
  });
});

describe('RN22 — sugestão de produto já existente', () => {
  test('acha a maionese atrás de "MAION HELLMANNS 500G TRA"', () => {
    const sugestao = sugerirProduto('MAION HELLMANNS 500G TRA', DESPENSA);
    assert.equal(sugestao?.nome, 'maionese');
  });

  test('acha o papel higiênico com a segunda palavra truncada', () => {
    const sugestao = sugerirProduto('PAPEL HIG DELUXE L12P11', DESPENSA);
    assert.equal(sugestao?.nome, 'papel higiênico');
  });

  test('acha o macarrão instantâneo com as duas palavras truncadas', () => {
    const sugestao = sugerirProduto('MAC INST NISSIN 85G T.MO', DESPENSA);
    assert.equal(sugestao?.nome, 'macarrão instantâneo');
  });

  test('marca e embalagem não atrapalham o encontro', () => {
    assert.equal(sugerirProduto('CHA MATTE LEAO 24G NATUR', DESPENSA)?.nome, 'chá mate');
    assert.equal(sugerirProduto('SAL REFINADO LEBRE 1KG', DESPENSA)?.nome, 'sal');
  });

  test('"SACOLA RETORL RAFIA DIVE" não vira sal', () => {
    // Sem o prefixo mínimo isto casaria por causa de "sa", e a sacola entraria
    // no estoque de sal — mexendo no alerta de reposição de um item real.
    assert.equal(sugerirProduto('SACOLA RETORL RAFIA DIVE', DESPENSA), null);
  });

  test('"MARG.QUALY 500G C/SAL" não vira sal', () => {
    // A margarina *com sal* contém a palavra, mas como qualificador. Sem a
    // regra da cabeça ela casaria com confiança 1,0 e entraria como reposição
    // de sal — um item que ninguém comprou saindo do alerta (RN08).
    assert.equal(sugerirProduto('MARG.QUALY 500G C/SAL', DESPENSA), null);
  });

  test('a mesma palavra na frente ainda casa', () => {
    // O contraponto: a regra da cabeça não pode custar o encontro legítimo.
    assert.equal(sugerirProduto('SAL REFINADO LEBRE 1KG', DESPENSA)?.nome, 'sal');
  });

  test('produto que a despensa não tem não recebe palpite', () => {
    assert.equal(sugerirProduto('FILME PVC LIFE CLEAN 28C', DESPENSA), null);
    assert.equal(sugerirProduto('ALFACE ROXA HIDROPONICA', DESPENSA), null);
  });

  test('despensa vazia não sugere nada, e não quebra', () => {
    assert.equal(sugerirProduto('ARROZ TIPO 1 5KG', []), null);
  });

  test('empate não escolhe: prefere calar a errar', () => {
    // Duas embalagens do mesmo item, indistinguíveis pela descrição truncada.
    const ambiguo = [
      { id: 1, nome: 'arroz' },
      { id: 2, nome: 'arroz' },
    ];
    assert.equal(sugerirProduto('ARROZ TIPO 1 5KG', ambiguo), null);
  });

  test('entre dois parentes, ganha o mais parecido', () => {
    const parecidos = [
      { id: 1, nome: 'papel higiênico' },
      { id: 2, nome: 'papel toalha' },
    ];
    assert.equal(sugerirProduto('PAPEL HIG DELUXE L12P11', parecidos)?.nome, 'papel higiênico');
  });

  test('nome idêntico dá confiança cheia', () => {
    assert.equal(semelhanca('arroz', 'arroz'), 1);
  });
});
