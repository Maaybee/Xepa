export { cores, type ModuloXepa } from './cores';
export { fontes, textos } from './tipografia';

/** Escala de 4 em 4. */
export const espaco = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

/**
 * Altura da barra de abas, sem contar o safe area de baixo.
 *
 * O expo-router 57 não expõe `useBottomTabBarHeight` por um caminho público,
 * então em vez de adivinhar o valor padrão do React Navigation nós o fixamos:
 * `(banca)/_layout.tsx` manda a barra ter esta altura e `TelaModulo` reserva
 * exatamente ela no fim da rolagem. Um número só, nos dois lugares.
 */
export const alturaBarraDeAbas = 64;

/**
 * Cantos medidos nos frames do template.
 *
 * O botão não é pílula: 19 de raio numa altura de 67 dá um retângulo bem
 * arredondado, não um semicírculo. `pilula` fica só para selo e chip.
 */
export const raio = {
  sm: 10,
  /** Busca, campo preenchido e topo da barra de abas. */
  md: 15,
  /** Cartão de produto. */
  lg: 18,
  /** Botão. */
  botao: 19,
  xl: 26,
  pilula: 999,
} as const;

/** Medidas fixas que vieram do template, em pt (os frames são de 414pt). */
export const medida = {
  /** Altura do botão principal. */
  botao: 67,
  /** Altura da busca. */
  busca: 52,
  /** Altura de uma linha de lista com ícone e chevron. */
  linhaLista: 62,
  /** Respiro horizontal das telas. */
  margem: 25,
} as const;

/**
 * Sombras do template: difusas, baixas e tingidas de lilás — nada de cinza
 * neutro, que sobre o fundo quase-branco lê como sujeira.
 *
 * `elevation` é o que o Android usa; iOS ignora e lê os `shadow*`.
 */
export const sombra = {
  cartao: {
    shadowColor: '#8B7BC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  alta: {
    shadowColor: '#6E5BB0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  /** Barra de abas: a sombra sobe, não desce. */
  barra: {
    shadowColor: '#6E5BB0',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.1,
    shadowRadius: 37,
    elevation: 12,
  },
} as const;
