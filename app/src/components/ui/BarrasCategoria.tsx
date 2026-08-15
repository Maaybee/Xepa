/**
 * Barras horizontais para comparar magnitude entre categorias nominais —
 * gasto por categoria (RF018) e tempo de estudo por matéria (RF028).
 *
 * Categoria e matéria são nominais: trocar a ordem não muda o significado, e
 * por isso todas as barras usam **a mesma cor**. Colorir cada barra de um tom
 * gastaria o canal de identidade recodificando o que o comprimento já diz — e
 * um arco-íris de tons vizinhos do nosso lilás colapsa sob daltonismo (o lilás
 * e o azul do brand ficam a ΔE 1,6 em protanopia).
 *
 * Série única, então não há legenda: o título da seção já diz o que está
 * plotado. O valor vai direto na ponta da barra, que é o que dispensa eixo.
 */

import { StyleSheet, View } from 'react-native';
import { cores, espaco } from '@/theme';
import { Texto } from './Texto';

export interface FatiaDeBarra {
  rotulo: string;
  valor: number;
}

interface Props {
  dados: FatiaDeBarra[];
  /** Como escrever o valor na ponta (dinheiro, duração…). */
  formatar(valor: number): string;
  cor?: string;
  /** Quantas barras mostrar antes de agrupar o resto. */
  limite?: number;
}

/** Espessura da marca. A spec do design system limita a 24. */
const ESPESSURA = 20;

export function BarrasCategoria({ dados, formatar, cor = cores.lilas, limite = 6 }: Props) {
  const ordenados = [...dados].filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor);
  if (ordenados.length === 0) return null;

  // Mais que `limite` categorias vira cauda agrupada: nunca mais cores, nunca
  // uma lista infinita de barrinhas.
  const visiveis = ordenados.slice(0, limite);
  const cauda = ordenados.slice(limite);
  const linhas =
    cauda.length > 0
      ? [
          ...visiveis,
          { rotulo: `Outras (${cauda.length})`, valor: cauda.reduce((s, d) => s + d.valor, 0) },
        ]
      : visiveis;

  const maior = Math.max(...linhas.map((l) => l.valor));

  return (
    <View style={estilos.grupo}>
      {linhas.map((linha) => (
        <View key={linha.rotulo} style={estilos.linha}>
          <View style={estilos.cabecalho}>
            <Texto variante="corpo" cor={cores.tintaMedia} numberOfLines={1} estilo={estilos.rotulo}>
              {linha.rotulo}
            </Texto>
            {/* O valor é texto: usa token de tinta, nunca a cor da série. */}
            <Texto variante="corpoForte">{formatar(linha.valor)}</Texto>
          </View>
          <View style={estilos.trilho}>
            <View
              style={[
                estilos.marca,
                {
                  backgroundColor: cor,
                  // Proporção do maior, não do total: a leitura aqui é
                  // comparar entre si, não fatia de um bolo.
                  width: `${Math.max((linha.valor / maior) * 100, 2)}%`,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: {
    gap: espaco.lg,
  },
  linha: {
    gap: espaco.xs,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
  rotulo: {
    flex: 1,
  },
  trilho: {
    height: ESPESSURA,
    justifyContent: 'center',
  },
  marca: {
    height: ESPESSURA,
    // Ponta arredondada no fim do dado, reta na linha de base.
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
});
