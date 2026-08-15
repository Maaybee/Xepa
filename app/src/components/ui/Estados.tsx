/** Os estados que toda lista tem: carregando, vazia e com erro. */

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { cores, espaco } from '@/theme';
import { Botao } from './Botao';
import { Texto } from './Texto';

export function Carregando({ rotulo = 'Carregando…' }: { rotulo?: string }) {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator color={cores.lilas} />
      <Texto variante="legenda" cor={cores.tintaFraca}>
        {rotulo}
      </Texto>
    </View>
  );
}

export function EstadoVazio({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <View style={estilos.centro}>
      <Texto variante="chamada" cor={cores.tintaFraca}>
        {titulo}
      </Texto>
      {descricao ? (
        <Texto variante="legenda" cor={cores.tintaFraca} estilo={estilos.centralizado}>
          {descricao}
        </Texto>
      ) : null}
    </View>
  );
}

export function EstadoDeErro({
  mensagem,
  aoTentarDeNovo,
}: {
  mensagem: string;
  aoTentarDeNovo?: (() => Promise<void> | void) | undefined;
}) {
  return (
    <View style={estilos.centro}>
      <Texto variante="corpo" cor={cores.erro} estilo={estilos.centralizado}>
        {mensagem}
      </Texto>
      {aoTentarDeNovo ? (
        <Botao titulo="Tentar de novo" aparencia="contorno" compacto aoTocar={aoTentarDeNovo} />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.sm,
    paddingVertical: espaco.xxl,
  },
  centralizado: {
    textAlign: 'center',
  },
});
