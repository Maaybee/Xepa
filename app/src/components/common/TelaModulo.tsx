/**
 * Moldura das telas de módulo.
 *
 * Concentra o que se repete nas cinco: cabeçalho com o nome do módulo, a
 * chamada no acento do módulo, puxar-para-atualizar e os estados de
 * carregando/erro. As telas cuidam só do conteúdo.
 */

import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alturaBarraDeAbas, cores, espaco, medida, raio, type ModuloXepa } from '@/theme';
import { Carregando, EstadoDeErro } from '@/components/ui/Estados';
import { Texto } from '@/components/ui/Texto';

interface Props {
  titulo: string;
  /** A frase de apoio sob o título, na voz do produto. */
  chamada?: string | undefined;
  modulo: ModuloXepa;
  children: ReactNode;
  carregando?: boolean;
  erro?: string | null;
  aoRecarregar?: (() => Promise<void> | void) | undefined;
  /** Telas fora das abas (o perfil, que abre como modal) passam `false`. */
  dentroDasAbas?: boolean;
  /**
   * Como se sai da tela.
   *
   * Aba não tem saída — o destino é a própria barra. Tela empilhada tem, e por
   * padrão tem: sem isso o único jeito de voltar é o gesto de borda do iOS, que
   * não se anuncia e não existe no Android. `fechar` é para o que sobe como
   * modal, onde "voltar" descreveria errado o movimento.
   */
  saida?: 'voltar' | 'fechar' | 'nenhuma';
}

export function TelaModulo({
  titulo,
  chamada,
  modulo,
  children,
  carregando = false,
  erro = null,
  aoRecarregar,
  dentroDasAbas = true,
  saida,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const acento = cores.modulo[modulo];
  const saidaEfetiva = saida ?? (dentroDasAbas ? 'nenhuma' : 'voltar');
  // A barra de abas fica por cima da rolagem; sem reservar a altura dela, o
  // último item da lista some atrás.
  const respiroInferior =
    insets.bottom + espaco.xxl + (dentroDasAbas ? alturaBarraDeAbas : 0);

  return (
    <ScrollView
      style={estilos.fundo}
      contentContainerStyle={[
        estilos.conteudo,
        { paddingTop: insets.top + espaco.lg, paddingBottom: respiroInferior },
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
        {saidaEfetiva !== 'nenhuma' ? (
          <Pressable
            onPress={() => {
              // Entrar direto na rota (link externo, recarga do Metro) deixa a
              // pilha sem passado: aí o destino é a banca, não lugar nenhum.
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
            accessibilityRole="button"
            accessibilityLabel={saidaEfetiva === 'fechar' ? 'Fechar' : 'Voltar'}
            hitSlop={12}
            style={({ pressed }) => [estilos.saida, pressed && estilos.saidaPressionada]}
          >
            <Feather
              name={saidaEfetiva === 'fechar' ? 'x' : 'chevron-left'}
              size={22}
              color={cores.tinta}
            />
          </Pressable>
        ) : null}
        <Texto variante="titulo">{titulo}</Texto>
        {chamada ? (
          <Texto variante="chamada" cor={cores.tintaMedia}>
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
    backgroundColor: cores.fundo,
  },
  conteudo: {
    paddingHorizontal: medida.margem,
    gap: espaco.xl,
  },
  cabecalho: {
    gap: espaco.xs,
  },
  saida: {
    width: 44,
    height: 44,
    borderRadius: raio.pilula,
    backgroundColor: cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    // O alvo é 44 (mínimo da HIG), mas o ícone dentro dele fica alinhado com a
    // margem da tela: sem isso o botão parece deslocado para dentro.
    marginLeft: -espaco.md,
    marginBottom: espaco.xs,
  },
  saidaPressionada: {
    opacity: 0.6,
  },
});
