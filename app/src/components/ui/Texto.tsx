/** Texto do design system: escolhe fonte, tamanho e cor por variante. */

import { Text } from 'react-native';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { cores, textos } from '@/theme';

export type VarianteTexto = keyof typeof textos;

interface Props extends TextProps {
  variante?: VarianteTexto;
  cor?: string;
  /** Anton e a fonte de seção pedem caixa alta; ligue quando fizer sentido. */
  maiusculas?: boolean;
  estilo?: StyleProp<TextStyle>;
}

export function Texto({
  variante = 'corpo',
  cor = cores.tinta,
  maiusculas = false,
  estilo,
  style,
  children,
  ...resto
}: Props) {
  return (
    <Text
      {...resto}
      style={[
        textos[variante],
        { color: cor },
        maiusculas && { textTransform: 'uppercase' },
        estilo,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
