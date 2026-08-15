/**
 * Superfície de conteúdo, na medida do cartão do template: branco sobre o
 * fundo quase-branco, 18 de raio e um filete de 1pt no lugar de sombra.
 *
 * `elevado` liga a sombra difusa para o cartão que precisa saltar do fundo —
 * no template é a exceção, não o padrão.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { cores, espaco, raio, sombra } from '@/theme';

interface Props {
  children: ReactNode;
  /** Fita de acento na lateral — a cor do módulo entra por aqui. */
  acento?: string;
  aoTocar?: () => void;
  elevado?: boolean;
  estilo?: StyleProp<ViewStyle>;
}

export function Cartao({ children, acento, aoTocar, elevado = false, estilo }: Props) {
  const conteudo = (
    <View
      style={[
        estilos.cartao,
        elevado && sombra.cartao,
        acento ? { borderLeftWidth: 4, borderLeftColor: acento } : null,
        estilo,
      ]}
    >
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
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.linha,
    borderRadius: raio.lg,
    padding: espaco.lg,
    gap: espaco.sm,
  },
});
