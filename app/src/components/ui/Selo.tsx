/** Etiqueta curta: status de lavagem, alerta de estoque, origem da transação. */

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
        { borderColor: cor },
        preenchido && { backgroundColor: cor },
      ]}
    >
      <Texto variante="legenda" cor={preenchido ? cores.papel : cor} maiusculas>
        {texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  selo: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
  },
});
