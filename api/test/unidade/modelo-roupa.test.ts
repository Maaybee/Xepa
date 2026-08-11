/**
 * RN14 — a peça entra na lista de "lavar" ao atingir o limite de usos.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { precisaLavar, toPecaView } from '../../src/models/roupa.js';
import type { PecaRoupa } from '../../src/models/roupa.js';

function peca(campos: Partial<PecaRoupa> = {}): PecaRoupa {
  return {
    id: 1,
    usuario_id: 1,
    nome: 'Calça jeans',
    tipo: 'calça',
    limite_usos: 3,
    usos_atuais: 0,
    criado_em: new Date('2026-08-01T12:00:00Z'),
    ...campos,
  };
}

describe('RN14 — precisaLavar', () => {
  it('não precisa antes do limite', () => {
    assert.equal(precisaLavar({ usos_atuais: 2, limite_usos: 3 }), false);
  });

  it('precisa ao atingir o limite', () => {
    assert.equal(precisaLavar({ usos_atuais: 3, limite_usos: 3 }), true);
  });

  it('continua precisando depois de passar do limite', () => {
    assert.equal(precisaLavar({ usos_atuais: 5, limite_usos: 3 }), true);
  });

  it('peça de uso único precisa de lavagem no primeiro uso', () => {
    assert.equal(precisaLavar({ usos_atuais: 1, limite_usos: 1 }), true);
  });
});

describe('toPecaView', () => {
  it('mostra quantos usos ainda restam', () => {
    const view = toPecaView(peca({ usos_atuais: 1 }));

    assert.equal(view.usosRestantes, 2);
    assert.equal(view.precisaLavar, false);
  });

  it('nunca mostra usos restantes negativos', () => {
    const view = toPecaView(peca({ usos_atuais: 7 }));

    assert.equal(view.usosRestantes, 0);
    assert.equal(view.precisaLavar, true);
  });

  it('não vaza o dono da peça', () => {
    assert.equal('usuario_id' in toPecaView(peca()), false);
  });
});
