/**
 * Cabeçalho de seção do template: título grande em 24 semibold à esquerda e,
 * à direita, um "ver todos" em 16 semibold na primária.
 *
 * O template não usa caixa alta nem rótulo cinza miúdo aqui — o peso e o
 * tamanho é que separam a seção do conteúdo.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { cores, espaco } from '@/theme';
import { Texto } from '@/components/ui/Texto';

interface Props {
  titulo: string;
  /** O "ver todos" da direita. */
  aoVerTudo?: (() => void) | undefined;
  rotuloVerTudo?: string;
  /** Escape para uma ação que não seja o "ver todos" padrão. */
  acao?: ReactNode;
  children: ReactNode;
}

export function Secao({
  titulo,
  aoVerTudo,
  rotuloVerTudo = 'Ver todos',
  acao,
  children,
}: Props) {
  return (
    <View style={estilos.secao}>
      <View style={estilos.linha}>
        <Texto variante="secaoGrande">{titulo}</Texto>
        {aoVerTudo ? (
          <Pressable
            onPress={aoVerTudo}
            accessibilityRole="button"
            style={({ pressed }) => (pressed ? estilos.pressionado : undefined)}
          >
            <Texto variante="rotuloCampo" cor={cores.lilasForte}>
              {rotuloVerTudo}
            </Texto>
          </Pressable>
        ) : (
          acao
        )}
      </View>
      <View style={estilos.corpo}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: {
    gap: espaco.md,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
  corpo: {
    gap: espaco.md,
  },
  pressionado: {
    opacity: 0.6,
  },
});
