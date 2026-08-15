/**
 * Etiqueta curta: status de lavagem, alerta de estoque, origem da transação.
 *
 * No template a etiqueta é um chip de fundo tingido, sem borda e sem caixa
 * alta — a cor é que carrega o significado. `preenchido` sobe o contraste
 * (fundo cheio, texto branco) para o que exige ação.
 */

import { StyleSheet, View } from 'react-native';
import { cores, espaco, raio } from '@/theme';
import { Texto } from './Texto';

interface Props {
  texto: string;
  cor?: string;
  /** Preenchido chama mais atenção; use para o que exige ação. */
  preenchido?: boolean;
}

export function Selo({ texto, cor = cores.tintaMedia, preenchido = false }: Props) {
  return (
    <View
      style={[
        estilos.selo,
        // O sufixo de 2 dígitos é o alfa em hex: ~12% de opacidade da própria
        // cor, que dá o tingido do template sem precisar de uma cor por caso.
        { backgroundColor: preenchido ? cor : `${cor}1F` },
      ]}
    >
      <Texto variante="legenda" cor={preenchido ? cores.branco : cor}>
        {texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  selo: {
    alignSelf: 'flex-start',
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.md,
    paddingVertical: 4,
  },
});
