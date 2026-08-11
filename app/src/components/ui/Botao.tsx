/** Botão do design system. Olive preenchido é a ação principal da tela. */

import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { cores, espaco, raio } from '@/theme';
import { Texto } from './Texto';

type Aparencia = 'principal' | 'contorno' | 'texto' | 'perigo';

interface Props {
  titulo: string;
  aoTocar(): void;
  aparencia?: Aparencia;
  carregando?: boolean;
  desabilitado?: boolean;
  compacto?: boolean;
  estilo?: StyleProp<ViewStyle>;
}

export function Botao({
  titulo,
  aoTocar,
  aparencia = 'principal',
  carregando = false,
  desabilitado = false,
  compacto = false,
  estilo,
}: Props) {
  const inativo = desabilitado || carregando;
  const paleta = PALETA[aparencia];

  return (
    <Pressable
      onPress={aoTocar}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={({ pressed }) => [
        estilos.base,
        compacto && estilos.compacto,
        {
          backgroundColor: paleta.fundo,
          borderColor: paleta.borda,
          opacity: inativo ? 0.5 : pressed ? 0.85 : 1,
        },
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={paleta.texto} size="small" />
      ) : (
        <View>
          <Texto variante="corpoForte" cor={paleta.texto}>
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const PALETA: Record<Aparencia, { fundo: string; borda: string; texto: string }> = {
  principal: { fundo: cores.olive, borda: cores.olive, texto: cores.papel },
  contorno: { fundo: 'transparent', borda: cores.linhaForte, texto: cores.tinta },
  texto: { fundo: 'transparent', borda: 'transparent', texto: cores.olive },
  perigo: { fundo: 'transparent', borda: cores.erro, texto: cores.erro },
};

const estilos = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: espaco.xl,
    borderRadius: raio.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compacto: {
    minHeight: 36,
    paddingHorizontal: espaco.lg,
  },
});
