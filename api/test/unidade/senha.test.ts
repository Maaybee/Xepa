/**
 * RN02 (força da senha) e RNF06 (hash + salt).
 *
 * Funções puras — não tocam o banco, então rodam sem o PGlite.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { gerarHash, validarSenha, verificarSenha } from '../../src/utils/senha.js';

describe('RN02 — validarSenha', () => {
  it('aceita senha com 8+ caracteres, maiúscula, número e especial', () => {
    assert.deepEqual(validarSenha('Xepa#2026'), []);
  });

  it('lista tudo que falta de uma vez', () => {
    assert.deepEqual(validarSenha('abc'), [
      'ter no mínimo 8 caracteres',
      'conter ao menos uma letra maiúscula',
      'conter ao menos um número',
      'conter ao menos um caractere especial',
    ]);
  });

  it('cobra o comprimento mínimo mesmo com tudo o mais presente', () => {
    assert.deepEqual(validarSenha('Ax1#'), ['ter no mínimo 8 caracteres']);
  });

  it('cobra a maiúscula', () => {
    assert.deepEqual(validarSenha('xepa#2026'), ['conter ao menos uma letra maiúscula']);
  });

  it('cobra o número', () => {
    assert.deepEqual(validarSenha('XepaXepa#'), ['conter ao menos um número']);
  });

  it('cobra o caractere especial', () => {
    assert.deepEqual(validarSenha('Xepa2026'), ['conter ao menos um caractere especial']);
  });

  it('aceita maiúscula acentuada — o público é brasileiro', () => {
    assert.deepEqual(validarSenha('Ótimo#2026'), []);
  });

  it('não conta letra acentuada como caractere especial', () => {
    assert.deepEqual(validarSenha('Senhaç2026'), ['conter ao menos um caractere especial']);
  });

  it('aceita espaço como caractere especial', () => {
    assert.deepEqual(validarSenha('Xepa 2026'), []);
  });
});

describe('RNF06 — hash da senha', () => {
  it('gera hash bcrypt verificável e diferente do texto puro', async () => {
    const { hash, salt } = await gerarHash('Xepa#2026');

    assert.notEqual(hash, 'Xepa#2026');
    assert.ok(hash.startsWith('$2b$12$'));
    assert.ok(hash.startsWith(salt));
    assert.equal(await verificarSenha('Xepa#2026', hash), true);
    assert.equal(await verificarSenha('Xepa#2027', hash), false);
  });

  it('a mesma senha gera hashes diferentes — o salt muda a cada conta', async () => {
    const primeiro = await gerarHash('Xepa#2026');
    const segundo = await gerarHash('Xepa#2026');

    assert.notEqual(primeiro.hash, segundo.hash);
    assert.equal(await verificarSenha('Xepa#2026', segundo.hash), true);
  });
});
