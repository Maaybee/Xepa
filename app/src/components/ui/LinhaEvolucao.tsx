/**
 * Evolução das notas de uma matéria (RF026/RF027, SD20).
 *
 * O backend já entrega a série pronta em `progressao.pontos`: cada avaliação em
 * ordem cronológica com a média acumulada até ali. Duas séries, mas não é um
 * caso categórico — a média acumulada **é** o assunto e as notas soltas são o
 * contexto que a produz. Isso é ênfase: a média em lilás forte, as notas em
 * cinza. Assim a leitura não depende de distinguir dois tons vizinhos, que é
 * justamente onde o lilás e o azul do brand colapsam sob daltonismo.
 *
 * Duas séries pedem legenda — ela está aqui embaixo, e o valor final de cada
 * linha vai rotulado na ponta.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { cores, espaco } from '@/theme';
import { Texto } from './Texto';

export interface PontoDeProgressao {
  data: string;
  descricao: string;
  valor: number;
  mediaAcumulada: number;
}

interface Props {
  pontos: PontoDeProgressao[];
  /** Teto da escala; nota escolar vai a 10. */
  maximo?: number;
}

const ALTURA = 180;
const RESPIRO = { topo: 16, base: 16, direita: 8, esquerda: 8 };

export function LinhaEvolucao({ pontos, maximo = 10 }: Props) {
  const [largura, setLargura] = useState(0);

  // Com um ponto só não há linha que desenhar — duas avaliações é o mínimo
  // para existir evolução.
  if (pontos.length < 2) return null;

  const alturaUtil = ALTURA - RESPIRO.topo - RESPIRO.base;
  const larguraUtil = Math.max(largura - RESPIRO.esquerda - RESPIRO.direita, 1);

  const x = (indice: number) =>
    RESPIRO.esquerda + (indice / (pontos.length - 1)) * larguraUtil;
  const y = (valor: number) =>
    RESPIRO.topo + alturaUtil - (Math.min(Math.max(valor, 0), maximo) / maximo) * alturaUtil;

  const emPontos = (pegar: (p: PontoDeProgressao) => number) =>
    pontos.map((p, i) => `${x(i)},${y(pegar(p))}`).join(' ');

  const ultimo = pontos[pontos.length - 1]!;

  return (
    <View style={estilos.bloco}>
      <View style={estilos.tela} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
        {largura > 0 ? (
          <Svg width={largura} height={ALTURA}>
            {/* Grade recessiva: hairline sólida, um passo fora da superfície. */}
            {[0, 0.5, 1].map((fracao) => (
              <Line
                key={fracao}
                x1={RESPIRO.esquerda}
                x2={largura - RESPIRO.direita}
                y1={RESPIRO.topo + alturaUtil * fracao}
                y2={RESPIRO.topo + alturaUtil * fracao}
                stroke={cores.linha}
                strokeWidth={1}
              />
            ))}

            {/* Contexto: as notas avulsas. */}
            <Polyline
              points={emPontos((p) => p.valor)}
              fill="none"
              stroke={cores.tintaMedia}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.45}
            />

            {/* Ênfase: a média acumulada é o assunto. */}
            <Polyline
              points={emPontos((p) => p.mediaAcumulada)}
              fill="none"
              stroke={cores.lilasForte}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {pontos.map((p, i) => (
              <Circle
                key={`${p.data}-${i}`}
                cx={x(i)}
                cy={y(p.valor)}
                r={4}
                fill={cores.tintaMedia}
                // Anel na cor da superfície, para o ponto sobreviver ao cruzar a linha.
                stroke={cores.superficie}
                strokeWidth={2}
              />
            ))}

            <Circle
              cx={x(pontos.length - 1)}
              cy={y(ultimo.mediaAcumulada)}
              r={5}
              fill={cores.lilasForte}
              stroke={cores.superficie}
              strokeWidth={2}
            />
          </Svg>
        ) : null}
      </View>

      {/* Duas séries: legenda sempre presente, com o valor da ponta rotulado. */}
      <View style={estilos.legenda}>
        <ItemDaLegenda
          cor={cores.lilasForte}
          rotulo="Média acumulada"
          valor={ultimo.mediaAcumulada.toFixed(2)}
        />
        <ItemDaLegenda
          cor={cores.tintaMedia}
          rotulo="Nota da avaliação"
          valor={ultimo.valor.toFixed(2)}
        />
      </View>
    </View>
  );
}

function ItemDaLegenda({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: string }) {
  return (
    <View style={estilos.itemLegenda}>
      <View style={[estilos.chave, { backgroundColor: cor }]} />
      {/* Texto em token de tinta; quem carrega a identidade é a chave colorida. */}
      <Texto variante="legenda" cor={cores.tintaMedia}>
        {rotulo}
      </Texto>
      <Texto variante="legenda">{valor}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: {
    gap: espaco.md,
  },
  tela: {
    height: ALTURA,
  },
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.lg,
  },
  itemLegenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
  },
  chave: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
});
