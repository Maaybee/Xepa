/**
 * Cartão do template (173×248, raio 18, filete de 1pt): topo com a imagem do
 * produto, nome em 16, uma linha de apoio em 14 e o valor em 18 com o botão
 * redondo no canto.
 *
 * No template o topo é foto do produto. A API do Xepa não guarda imagem de
 * item, então o lugar da foto recebe um medalhão tingido com o acento do
 * módulo — mesma silhueta, sem inventar dado que não existe.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { cores, espaco, raio } from '@/theme';
import { Texto } from './Texto';

type NomeDeIcone = keyof typeof Feather.glyphMap;

interface Props {
  nome: string;
  /** A linha de apoio — no template é "7pcs, Price"; aqui, quantidade/unidade. */
  apoio?: string | undefined;
  /** O número em destaque no pé do cartão. */
  destaque?: string | undefined;
  icone?: NomeDeIcone;
  acento?: string;
  aoTocar?: (() => void) | undefined;
  /** Ação do botão redondo no canto. Sem ela o botão não aparece. */
  aoAgir?: (() => void) | undefined;
  /**
   * Glifo do botão redondo. No template é sempre "+", mas na despensa o botão
   * dá baixa no estoque — pôr "+" ali diria o contrário do que a ação faz.
   */
  iconeAcao?: NomeDeIcone;
  rotuloAcao?: string;
}

export function CartaoItem({
  nome,
  apoio,
  destaque,
  icone = 'package',
  acento = cores.lilas,
  aoTocar,
  aoAgir,
  iconeAcao = 'plus',
  rotuloAcao,
}: Props) {
  return (
    <Pressable
      onPress={aoTocar}
      disabled={!aoTocar}
      accessibilityRole={aoTocar ? 'button' : undefined}
      style={({ pressed }) => [estilos.cartao, pressed && aoTocar ? estilos.pressionado : null]}
    >
      <View style={[estilos.medalhao, { backgroundColor: `${acento}1F` }]}>
        <Feather name={icone} size={34} color={acento} />
      </View>

      <View style={estilos.texto}>
        <Texto variante="cartaoNome" numberOfLines={2}>
          {nome}
        </Texto>
        {apoio ? (
          <Texto variante="corpo" cor={cores.tintaMedia} numberOfLines={1}>
            {apoio}
          </Texto>
        ) : null}
      </View>

      <View style={estilos.pe}>
        {destaque ? <Texto variante="linha">{destaque}</Texto> : <View />}
        {aoAgir ? (
          <Pressable
            onPress={aoAgir}
            accessibilityRole="button"
            accessibilityLabel={rotuloAcao ?? nome}
            style={({ pressed }) => [
              estilos.botaoRedondo,
              { backgroundColor: acento, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name={iconeAcao} size={22} color={cores.branco} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    // No template o cartão tem 173pt fixos numa tela de 414. Em proporção o
    // desenho é o mesmo e não estoura numa tela de 375.
    width: '48%',
    height: 249,
    backgroundColor: cores.superficie,
    borderRadius: raio.lg,
    borderWidth: 1,
    borderColor: cores.linha,
    padding: espaco.lg,
    justifyContent: 'space-between',
  },
  pressionado: {
    opacity: 0.85,
  },
  medalhao: {
    height: 80,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    gap: 2,
  },
  pe: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botaoRedondo: {
    width: 46,
    height: 46,
    borderRadius: raio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
