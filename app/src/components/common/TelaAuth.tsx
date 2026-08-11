/** Moldura das telas públicas: marca do Xepa em cima, formulário embaixo. */

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, espaco } from '@/theme';
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
          <Texto variante="titulo" maiusculas>
            Xepa
          </Texto>
          <Texto variante="marcador" cor={cores.olive}>
            o que sobra bem aproveitado
          </Texto>
        </View>

        <View style={estilos.cabecalho}>
          <Texto variante="tituloMenor" maiusculas>
            {titulo}
          </Texto>
          <Texto variante="corpo" cor={cores.tintaMedia}>
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
    backgroundColor: cores.papel,
  },
  conteudo: {
    paddingHorizontal: espaco.lg,
    gap: espaco.xl,
    flexGrow: 1,
  },
  marca: {
    gap: espaco.xs,
  },
  cabecalho: {
    gap: espaco.xs,
  },
});
