/**
 * Moldura das telas públicas, na forma das telas de entrada do template: a
 * marca centralizada no alto, e embaixo o título em 26 com a chamada em 16
 * cinza logo abaixo.
 *
 * O template dá 25pt de respiro lateral e não usa caixa alta em nada — o
 * título se separa por peso e tamanho, não por forma da letra.
 */

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, espaco, medida } from '@/theme';
import { Texto } from '@/components/ui/Texto';

interface Props {
  titulo: string;
  chamada: string;
  children: ReactNode;
}

export function TelaAuth({ titulo, chamada, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={estilos.fundo}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          estilos.conteudo,
          { paddingTop: insets.top + espaco.xxl, paddingBottom: insets.bottom + espaco.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.marca}>
          <Texto variante="titulo" cor={cores.lilas}>
            Xepa
          </Texto>
          <Texto variante="corpo" cor={cores.tintaMedia}>
            o que sobra bem aproveitado
          </Texto>
        </View>

        <View style={estilos.cabecalho}>
          <Texto variante="titulo">{titulo}</Texto>
          <Texto variante="chamada" cor={cores.tintaMedia}>
            {chamada}
          </Texto>
        </View>

        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  conteudo: {
    paddingHorizontal: medida.margem,
    gap: espaco.xl,
    flexGrow: 1,
  },
  marca: {
    alignItems: 'center',
    gap: espaco.xs,
    paddingVertical: espaco.xl,
  },
  cabecalho: {
    gap: espaco.xs,
  },
});
