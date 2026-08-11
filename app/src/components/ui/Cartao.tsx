/**
 * Superfície de conteúdo. Papel sobre papel: a separação vem da borda, não de
 * sombra — combina com a base off-white do brand kit.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { cores, espaco, raio } from '@/theme';

interface Props {
  children: ReactNode;
  /** Fita de acento na lateral — a cor do módulo entra por aqui. */
  acento?: string;
  aoTocar?: () => void;
  estilo?: StyleProp<ViewStyle>;
}

export function Cartao({ children, acento, aoTocar, estilo }: Props) {
  const conteudo = (
    <View style={[estilos.cartao, acento ? { borderLeftWidth: 4, borderLeftColor: acento } : null, estilo]}>
      {children}
    </View>
  );

  if (!aoTocar) return conteudo;
  return (
    <Pressable onPress={aoTocar} style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
      {conteudo}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.papelCartao,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.lg,
    padding: espaco.lg,
    gap: espaco.sm,
  },
});
