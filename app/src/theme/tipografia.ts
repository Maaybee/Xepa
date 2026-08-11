/**
 * Tipografia do brand kit: Anton (títulos), Permanent Marker (acentos escritos
 * à mão, na voz de feira) e Instrument Sans (texto corrido).
 *
 * Os nomes batem com os que `_layout.tsx` registra em `useFonts`.
 */

export const fontes = {
  /** Anton — título de tela, sempre em caixa alta. */
  display: 'Anton_400Regular',
  /** Permanent Marker — o carimbo de feira: números-destaque e apelidos. */
  marcador: 'PermanentMarker_400Regular',
  corpo: 'InstrumentSans_400Regular',
  corpoMedio: 'InstrumentSans_500Medium',
  corpoForte: 'InstrumentSans_600SemiBold',
} as const;

export const textos = {
  titulo: { fontFamily: fontes.display, fontSize: 34, letterSpacing: 0.5, lineHeight: 38 },
  tituloMenor: { fontFamily: fontes.display, fontSize: 22, letterSpacing: 0.4, lineHeight: 26 },
  marcador: { fontFamily: fontes.marcador, fontSize: 18, lineHeight: 24 },
  numeroGrande: { fontFamily: fontes.display, fontSize: 40, lineHeight: 44 },
  secao: { fontFamily: fontes.corpoForte, fontSize: 13, letterSpacing: 1.2, lineHeight: 18 },
  corpo: { fontFamily: fontes.corpo, fontSize: 15, lineHeight: 22 },
  corpoForte: { fontFamily: fontes.corpoForte, fontSize: 15, lineHeight: 22 },
  rotulo: { fontFamily: fontes.corpoMedio, fontSize: 13, lineHeight: 18 },
  legenda: { fontFamily: fontes.corpo, fontSize: 12, lineHeight: 16 },
} as const;
