/** Texto do design system: escolhe fonte, tamanho e cor por variante. */

import { Text } from 'react-native';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { cores, textos } from '@/theme';

export type VarianteTexto = keyof typeof textos;

interface Props extends TextProps {
  variante?: VarianteTexto;
  cor?: string;
  estilo?: StyleProp<TextStyle>;
}

export function Texto({
  variante = 'corpo',
  cor = cores.tinta,
  estilo,
  style,
  children,
  ...resto
}: Props) {
  return (
    <Text {...resto} style={[textos[variante], { color: cor }, estilo, style]}>
      {children}
    </Text>
  );
}
