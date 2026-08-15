/**
 * Botão do design system, na forma do template: bloco de 67pt de altura com
 * 19 de raio e o rótulo em 18 semibold no centro.
 *
 * `principal` é a única ação cheia da tela. `suave` é o botão secundário do
 * template (fundo mudo + texto na primária), o mesmo do "Log Out" da conta.
 */

import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { cores, espaco, medida, raio } from '@/theme';
import { Texto } from './Texto';

type Aparencia = 'principal' | 'suave' | 'contorno' | 'texto' | 'perigo';

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
          <Texto variante={compacto ? 'corpoForte' : 'botao'} cor={paleta.texto}>
            {titulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const PALETA: Record<Aparencia, { fundo: string; borda: string; texto: string }> = {
  principal: { fundo: cores.lilas, borda: cores.lilas, texto: cores.branco },
  suave: { fundo: cores.fundoMudo, borda: cores.fundoMudo, texto: cores.lilasForte },
  contorno: { fundo: 'transparent', borda: cores.linhaForte, texto: cores.tinta },
  texto: { fundo: 'transparent', borda: 'transparent', texto: cores.lilasForte },
  perigo: { fundo: cores.erroTinta, borda: cores.erroTinta, texto: cores.erro },
};

const estilos = StyleSheet.create({
  base: {
    height: medida.botao,
    paddingHorizontal: espaco.xl,
    borderRadius: raio.botao,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compacto: {
    height: 40,
    paddingHorizontal: espaco.lg,
    borderRadius: raio.md,
  },
});
