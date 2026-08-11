/**
 * Paleta do Xepa, materializada a partir do brand kit descrito em
 * `docs/01-visao-geral.md`: base off-white (papel), tinta quase preta, olive
 * profundo como única cor primária e tons dessaturados por módulo usados só
 * como pequenos acentos.
 *
 * Regra do brand: cor de módulo é acento — aparece em selo, ícone e detalhe,
 * nunca preenchendo áreas grandes. Área grande é papel.
 */

export const cores = {
  /** Base: papel de feira, não branco puro. */
  papel: '#F4F1E8',
  papelFundo: '#EDE9DC',
  papelCartao: '#FBFAF5',

  /** Tinta: quase preta, nunca #000. */
  tinta: '#1A1A18',
  tintaMedia: '#4A4A44',
  tintaFraca: '#84837A',

  /** Primária. */
  olive: '#414D23',
  oliveClaro: '#5C6B33',
  oliveTinta: '#E4E5D2',

  linha: '#DCD8C8',
  linhaForte: '#C4BFAB',

  /** Acentos de módulo — dessaturados de propósito. */
  modulo: {
    banca: '#414D23',
    despensa: '#A9714B',
    grana: '#4F7263',
    cabeca: '#59698C',
    roupa: '#7C6289',
  },

  /** Semânticas. */
  sucesso: '#4B7345',
  atencao: '#A8762A',
  erro: '#A03D3D',
  erroTinta: '#F5E3E1',

  branco: '#FFFFFF',
} as const;

export type ModuloXepa = keyof typeof cores.modulo;
