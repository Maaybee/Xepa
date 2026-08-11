/**
 * Faixa de aviso. É onde aparecem as mensagens que o backend devolve junto
 * das ações: alerta de reposição (RN08), estouro de orçamento (RN12), hora de
 * lavar (RN14).
 */

import { StyleSheet, View } from 'react-native';
import { cores, espaco, raio } from '@/theme';
import { Texto } from './Texto';

type Tom = 'erro' | 'atencao' | 'sucesso' | 'neutro';

interface Props {
  mensagem: string;
  tom?: Tom;
}

export function Aviso({ mensagem, tom = 'neutro' }: Props) {
  const cor = COR[tom];
  return (
    <View style={[estilos.faixa, { borderColor: cor }]}>
      <View style={[estilos.marca, { backgroundColor: cor }]} />
      <Texto variante="corpo" cor={cores.tinta} estilo={estilos.texto}>
        {mensagem}
      </Texto>
    </View>
  );
}

const COR: Record<Tom, string> = {
  erro: cores.erro,
  atencao: cores.atencao,
  sucesso: cores.sucesso,
  neutro: cores.tintaMedia,
};

const estilos = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: espaco.md,
    borderWidth: 1,
    borderRadius: raio.md,
    backgroundColor: cores.papelCartao,
    paddingRight: espaco.md,
    overflow: 'hidden',
  },
  marca: {
    width: 4,
  },
  texto: {
    flex: 1,
    paddingVertical: espaco.md,
  },
});
