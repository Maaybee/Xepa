/**
 * Barra de progresso. Serve ao orçamento consumido (RN12) e aos usos da peça
 * até a lavagem (RN14) — em ambos o que importa é "quanto falta para o
 * limite".
 */

import { StyleSheet, View } from 'react-native';
import { cores, raio } from '@/theme';

interface Props {
  /** De 0 a 1; acima de 1 a barra enche e muda de cor. */
  proporcao: number;
  cor?: string;
  corDeEstouro?: string;
}

export function Barra({ proporcao, cor = cores.lilas, corDeEstouro = cores.erro }: Props) {
  const estourou = proporcao > 1;
  const largura = `${Math.min(Math.max(proporcao, 0), 1) * 100}%` as const;

  return (
    <View style={estilos.trilho}>
      <View style={[estilos.preenchimento, { width: largura, backgroundColor: estourou ? corDeEstouro : cor }]} />
    </View>
  );
}

const estilos = StyleSheet.create({
  trilho: {
    height: 8,
    borderRadius: raio.pilula,
    backgroundColor: cores.lilasTinta,
    overflow: 'hidden',
  },
  preenchimento: {
    height: '100%',
    borderRadius: raio.pilula,
  },
});
