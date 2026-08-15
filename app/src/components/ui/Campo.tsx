/**
 * Campo de texto na forma do template: sem caixa. O rótulo fica em 16 semibold
 * acima, o valor em 18 medium, e a única moldura é o filete de 1pt embaixo.
 *
 * O filete assume a primária no foco e a cor de erro quando há erro — é o
 * único sinal de estado que o campo tem, já que não existe borda para tingir.
 */

import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { cores, espaco, textos } from '@/theme';
import { Texto } from './Texto';

interface Props extends Omit<TextInputProps, 'style'> {
  rotulo: string;
  dica?: string | undefined;
  erro?: string | null | undefined;
}

export function Campo({ rotulo, dica, erro, ...resto }: Props) {
  const [focado, setFocado] = useState(false);
  const corDoFilete = erro ? cores.erro : focado ? cores.lilas : cores.linhaForte;

  return (
    <View style={estilos.container}>
      <Texto variante="rotuloCampo" cor={cores.tintaMedia}>
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
        style={[estilos.entrada, { borderBottomColor: corDoFilete }]}
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
    ...textos.valorCampo,
    color: cores.tinta,
    borderBottomWidth: 1,
    paddingVertical: espaco.sm,
    paddingHorizontal: 0,
    minHeight: 44,
  },
});
