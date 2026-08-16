/**
 * O ícone de categoria do item da despensa.
 *
 * Os nomes daqui saíram de uma nota real (35260705002327000116…), truncados
 * como o PDV entregou: `MARG.QUALY 500G C/SAL`, `AZEIT.VERDE FATIADA KG`. É
 * contra esse texto que a inferência precisa funcionar, não contra nomes
 * limpos que ninguém digita.
 *
 * Roda com `node --test --import tsx src/utils/categoriaVisual.test.ts`.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { desenhoDoItem } from './categoriaVisual';

function categoriaDe(nome: string): string {
  return desenhoDoItem(nome, null).rotulo;
}

describe('categoria do item, a partir do nome truncado da nota', () => {
  test('hortifrúti é reconhecido a granel, que é o que não tem código de barras', () => {
    assert.equal(categoriaDe('BATATA LAVADA KG'), 'Hortifrúti');
    assert.equal(categoriaDe('CAQUI FUYU FRUTA KG'), 'Hortifrúti');
    assert.equal(categoriaDe('MACA FUJI MEDIA KG'), 'Hortifrúti');
  });

  test('corte de carne e frios caem em Carnes', () => {
    assert.equal(categoriaDe('PEITO FRANGO S/OSSO KG'), 'Carnes');
    assert.equal(categoriaDe('MUSCULO BOVINO KG'), 'Carnes');
    assert.equal(categoriaDe('PATE SADIA 120G PRESUNTO'), 'Carnes');
  });

  test('marca abreviada ainda é reconhecida', () => {
    // `MARG` não casa com "margarina"; é a abreviação que precisa de pista.
    assert.equal(categoriaDe('MARG.QUALY 500G C/SAL'), 'Laticínios');
    assert.equal(categoriaDe('AZEIT.VERDE FATIADA KG'), 'Mercearia');
    assert.equal(categoriaDe('GELAT.PO DR.OETKER SAB L'), 'Mercearia');
  });

  test('a pista de uma palavra só não casa no meio de outra', () => {
    // `mac` é pista de mercearia, mas "maçã" é fruta — e a pista não pode
    // decidir isso por acaso.
    assert.equal(categoriaDe('MACA FUJI MEDIA KG'), 'Hortifrúti');
    assert.equal(categoriaDe('MAC BARILLA 500G PICOLIN'), 'Mercearia');
  });

  test('papel higiênico e papel toalha não caem na mesma pista de mercearia', () => {
    assert.equal(categoriaDe('PAPEL HIG DELUXE L12P11'), 'Higiene');
    assert.equal(categoriaDe('PAPEL TOALHA MAXIM 2UN C'), 'Higiene');
    assert.equal(categoriaDe('PAPEL ALUM.LIFE CLEAN 30'), 'Limpeza');
  });

  test('o que não é comida nem se encaixa fica genérico, sem chutar', () => {
    assert.equal(categoriaDe('SACOLA RETORL RAFIA DIVE'), 'Item');
  });

  test('a categoria digitada manda sobre o palpite do nome', () => {
    // O usuário chamou de bebida; o nome diria hortifrúti. Declaração vence.
    assert.equal(desenhoDoItem('suco de laranja', 'bebidas').rotulo, 'Bebidas');
  });

  test('sem nome nem categoria, não quebra', () => {
    assert.equal(desenhoDoItem('', null).rotulo, 'Item');
  });
});
