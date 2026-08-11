/**
 * Moldura das telas de módulo.
 *
 * Concentra o que se repete nas cinco: cabeçalho com o nome do módulo em
 * Anton, a chamada no marcador, puxar-para-atualizar e os estados de
 * carregando/erro. As telas cuidam só do conteúdo.
 */

import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, espaco, type ModuloXepa } from '@/theme';
import { Carregando, EstadoDeErro } from '@/components/ui/Estados';
import { Texto } from '@/components/ui/Texto';

interface Props {
  titulo: string;
  /** A frase no marcador, na voz de feira do produto. */
  chamada?: string | undefined;
  modulo: ModuloXepa;
  children: ReactNode;
  carregando?: boolean;
  erro?: string | null;
  aoRecarregar?: (() => Promise<void> | void) | undefined;
}

export function TelaModulo({
  titulo,
  chamada,
  modulo,
  children,
  carregando = false,
  erro = null,
  aoRecarregar,
}: Props) {
  const insets = useSafeAreaInsets();
  const acento = cores.modulo[modulo];

  return (
    <ScrollView
      style={estilos.fundo}
      contentContainerStyle={[
        estilos.conteudo,
        { paddingTop: insets.top + espaco.lg, paddingBottom: insets.bottom + espaco.xxl },
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        aoRecarregar ? (
          <RefreshControl
            refreshing={false}
            onRefresh={() => void aoRecarregar()}
            tintColor={acento}
          />
        ) : undefined
      }
    >
      <View style={estilos.cabecalho}>
        <View style={[estilos.risco, { backgroundColor: acento }]} />
        <Texto variante="titulo" maiusculas>
          {titulo}
        </Texto>
        {chamada ? (
          <Texto variante="marcador" cor={acento}>
            {chamada}
          </Texto>
        ) : null}
      </View>

      {/* O erro não some com o conteúdo já carregado: o que veio antes continua útil. */}
      {erro ? <EstadoDeErro mensagem={erro} aoTentarDeNovo={aoRecarregar} /> : null}
      {carregando && !erro ? <Carregando /> : children}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: cores.papel,
  },
  conteudo: {
    paddingHorizontal: espaco.lg,
    gap: espaco.lg,
  },
  cabecalho: {
    gap: espaco.xs,
  },
  risco: {
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: espaco.sm,
  },
});
