/** Campo de texto com rótulo, dica e erro. */

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { cores, espaco, raio, textos } from '@/theme';
import { Texto } from './Texto';

interface Props extends Omit<TextInputProps, 'style'> {
  rotulo: string;
  dica?: string | undefined;
  erro?: string | null | undefined;
}

export function Campo({ rotulo, dica, erro, ...resto }: Props) {
  const [focado, setFocado] = useState(false);

  return (
    <View style={estilos.container}>
      <Texto variante="rotulo" cor={cores.tintaMedia}>
        {rotulo}
      </Texto>
      <TextInput
        {...resto}
        onFocus={(evento) => {
          setFocado(true);
          resto.onFocus?.(evento);
        }}
        onBlur={(evento) => {
          setFocado(false);
          resto.onBlur?.(evento);
        }}
        placeholderTextColor={cores.tintaFraca}
        style={[
          estilos.entrada,
          focado && { borderColor: cores.olive },
          erro ? { borderColor: cores.erro } : null,
        ]}
      />
      {erro ? (
        <Texto variante="legenda" cor={cores.erro}>
          {erro}
        </Texto>
      ) : dica ? (
        <Texto variante="legenda" cor={cores.tintaFraca}>
          {dica}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    gap: espaco.xs,
  },
  entrada: {
    ...textos.corpo,
    color: cores.tinta,
    backgroundColor: cores.papelCartao,
    borderWidth: 1.5,
    borderColor: cores.linha,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    minHeight: 48,
  },
});
