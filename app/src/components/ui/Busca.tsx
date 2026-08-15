/**
 * Busca do template: bloco de fundo mudo com 15 de raio, lupa à esquerda e o
 * texto em 14 semibold. Não tem borda — o contraste com a superfície branca
 * já basta.
 */

import { StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { cores, espaco, medida, raio, textos } from '@/theme';

interface Props {
  valor: string;
  aoMudar(texto: string): void;
  dica?: string;
}

export function Busca({ valor, aoMudar, dica = 'Buscar' }: Props) {
  return (
    <View style={estilos.caixa}>
      <Feather name="search" size={18} color={cores.tintaMedia} />
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        placeholder={dica}
        placeholderTextColor={cores.tintaMedia}
        style={estilos.entrada}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    height: medida.busca,
    backgroundColor: cores.fundoMudo,
    borderRadius: raio.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaco.lg,
    gap: espaco.md,
  },
  entrada: {
    ...textos.busca,
    color: cores.tinta,
    flex: 1,
    padding: 0,
  },
});
