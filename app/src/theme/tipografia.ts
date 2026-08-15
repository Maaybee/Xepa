/**
 * Tipografia na linguagem do template: uma sans arredondada só, diferenciada
 * por peso e tamanho em vez de por família.
 *
 * O template original usa Gilroy, que é paga; Poppins é o substituto livre com
 * o mesmo desenho geométrico de bojo alto. Anton e Permanent Marker saíram do
 * app — a voz de feira agora mora no texto, não na fonte.
 *
 * Os tamanhos vieram medidos dos frames (414pt de largura), então valem como
 * pt direto no React Native.
 *
 * Os nomes batem com os que `_layout.tsx` registra em `useFonts`.
 */

export const fontes = {
  corpo: 'Poppins_400Regular',
  corpoMedio: 'Poppins_500Medium',
  corpoForte: 'Poppins_600SemiBold',
} as const;

export const textos = {
  /** Título de tela ("Loging", "Sign Up"). O template aperta o tracking. */
  titulo: { fontFamily: fontes.corpoForte, fontSize: 26, letterSpacing: -0.3, lineHeight: 34 },
  /** Cabeçalho de seção ("Exclusive Offer") — grande e sem caixa alta. */
  secaoGrande: { fontFamily: fontes.corpoForte, fontSize: 24, letterSpacing: -0.2, lineHeight: 30 },
  /** Nome no topo da conta. */
  tituloMenor: { fontFamily: fontes.corpoForte, fontSize: 20, letterSpacing: -0.2, lineHeight: 26 },
  /** Rótulo de linha de lista e texto de botão — o template usa 18 nos dois. */
  linha: { fontFamily: fontes.corpoForte, fontSize: 18, lineHeight: 24 },
  botao: { fontFamily: fontes.corpoForte, fontSize: 18, letterSpacing: -0.2, lineHeight: 24 },
  /** Valor digitado num campo. */
  valorCampo: { fontFamily: fontes.corpoMedio, fontSize: 18, lineHeight: 26 },
  /** Rótulo acima do campo, e chamada sob um título. */
  rotuloCampo: { fontFamily: fontes.corpoForte, fontSize: 16, lineHeight: 22 },
  chamada: { fontFamily: fontes.corpoMedio, fontSize: 16, lineHeight: 22 },
  /** Nome no cartão de produto. */
  cartaoNome: { fontFamily: fontes.corpoForte, fontSize: 16, letterSpacing: 0.1, lineHeight: 20 },
  /** Número-destaque (saldo, gasto do mês). */
  numeroGrande: { fontFamily: fontes.corpoForte, fontSize: 34, letterSpacing: -0.5, lineHeight: 42 },
  corpo: { fontFamily: fontes.corpo, fontSize: 14, lineHeight: 20 },
  corpoForte: { fontFamily: fontes.corpoForte, fontSize: 14, lineHeight: 20 },
  /** Placeholder da busca. */
  busca: { fontFamily: fontes.corpoForte, fontSize: 14, lineHeight: 20 },
  /** Rótulo da barra de abas. */
  aba: { fontFamily: fontes.corpoForte, fontSize: 12, lineHeight: 16 },
  rotulo: { fontFamily: fontes.corpoMedio, fontSize: 13, lineHeight: 18 },
  legenda: { fontFamily: fontes.corpo, fontSize: 12, lineHeight: 16 },
} as const;
