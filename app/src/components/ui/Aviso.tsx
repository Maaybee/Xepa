/**
 * Faixa de aviso. É onde aparecem as mensagens que o backend devolve junto
 * das ações: alerta de reposição (RN08), estouro de orçamento (RN12), hora de
 * lavar (RN14).
 *
 * No template não existe faixa com borda e fita lateral: o aviso é um bloco de
 * fundo tingido na própria cor do tom, com 15 de raio e o texto na cor cheia.
 */

import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
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
    // O sufixo de 2 dígitos é o alfa em hex — ~12% da própria cor do tom.
    <View style={[estilos.faixa, { backgroundColor: `${cor}1F` }]}>
      <Feather name={ICONE[tom]} size={18} color={cor} style={estilos.icone} />
      <Texto variante="corpo" cor={cor} estilo={estilos.texto}>
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

const ICONE: Record<Tom, keyof typeof Feather.glyphMap> = {
  erro: 'alert-circle',
  atencao: 'alert-triangle',
  sucesso: 'check-circle',
  neutro: 'info',
};

const estilos = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaco.md,
    borderRadius: raio.md,
    padding: espaco.lg,
  },
  icone: {
    // Alinha o glifo com a primeira linha do texto, não com o bloco todo.
    marginTop: 1,
  },
  texto: {
    flex: 1,
  },
});
