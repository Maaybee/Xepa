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

export const raio = {
  sm: 6,
  md: 10,
  lg: 16,
  pilula: 999,
} as const;
