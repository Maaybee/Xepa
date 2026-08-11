/** Bloco com título de seção e uma ação opcional à direita. */

import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { cores, espaco } from '@/theme';
import { Texto } from '@/components/ui/Texto';

interface Props {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
}

export function Secao({ titulo, acao, children }: Props) {
  return (
    <View style={estilos.secao}>
      <View style={estilos.linha}>
        <Texto variante="secao" cor={cores.tintaFraca} maiusculas>
          {titulo}
        </Texto>
        {acao}
      </View>
      <View style={estilos.corpo}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  secao: {
    gap: espaco.md,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
  corpo: {
    gap: espaco.md,
  },
});
