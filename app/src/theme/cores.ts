/**
 * Paleta do Xepa na linguagem visual do template de mercado: superfície branca,
 * fundo quase branco puxado pro lilás, uma primária só e acentos suaves.
 *
 * O brand kit antigo (papel off-white + olive profundo) saiu junto com as
 * fontes de feira — ver `tipografia.ts`. A regra que sobreviveu é a mesma: cor
 * de módulo é acento, aparece em selo, ícone e detalhe, nunca preenchendo área
 * grande. Área grande é superfície.
 */

export const cores = {
  /** Base: branco e um quase-branco levemente lilás. */
  fundo: '#FBFAFF',
  fundoMudo: '#F4F2FC',
  superficie: '#FFFFFF',

  /** Texto: roxo-azulado bem escuro, nunca #000. */
  tinta: '#23204A',
  tintaMedia: '#6E6A93',
  tintaFraca: '#A8A4C4',

  /** Primária: lilás. */
  lilas: '#9B7EDE',
  lilasForte: '#7B5BC7',
  lilasTinta: '#F0EAFB',

  /** Secundária: azul. */
  azul: '#6C8BE0',
  azulTinta: '#E8EEFC',

  linha: '#EAE6F7',
  linhaForte: '#D8D2EE',

  /** Acentos de módulo — dentro do espectro lilás→azul, com um rosa. */
  modulo: {
    banca: '#9B7EDE',
    despensa: '#F0A5C9',
    grana: '#6FBFD8',
    cabeca: '#6C8BE0',
    roupa: '#B98FE8',
  },

  /** Semânticas. */
  sucesso: '#4FBF9F',
  atencao: '#F0B95C',
  erro: '#E8697D',
  erroTinta: '#FDECEF',

  branco: '#FFFFFF',
} as const;

export type ModuloXepa = keyof typeof cores.modulo;
