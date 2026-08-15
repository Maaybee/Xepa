/**
 * SD20 — desempenho de uma matéria (RF026, RF027, RF028).
 *
 * É a única tela que chama `/cabeca/materias/:id/desempenho`. A rota do
 * panorama não traz `progressao`, que é a série com a média acumulada ponto a
 * ponto — sem ela não há gráfico de evolução.
 *
 * A tendência (`subindo`/`caindo`/`estavel`) vem calculada do backend; aqui ela
 * só ganha cor e ícone. Cor sozinha não carrega o significado: o selo sempre
 * traz a palavra escrita.
 */

import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as cabecaApi from '@/services/api/cabeca';
import type { Tendencia } from '@/types/api';
import { useRequisicao } from '@/hooks/useRequisicao';
import { TelaModulo } from '@/components/common/TelaModulo';
import { Secao } from '@/components/common/Secao';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoVazio } from '@/components/ui/Estados';
import { LinhaEvolucao } from '@/components/ui/LinhaEvolucao';
import { Selo } from '@/components/ui/Selo';
import { Texto } from '@/components/ui/Texto';
import { cores, espaco } from '@/theme';
import { dataCurta, duracao } from '@/utils/formato';

const ACENTO = cores.modulo.cabeca;

export function MateriaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const materiaId = Number(id);

  const desempenho = useRequisicao(
    () => cabecaApi.obterDesempenho(materiaId),
    [materiaId],
  );

  const dados = desempenho.dados;

  return (
    <TelaModulo
      titulo={dados?.materia.nome ?? 'Matéria'}
      chamada={dados ? `média ${dados.materia.metodoMedia}` : undefined}
      modulo="cabeca"
      carregando={desempenho.carregando && dados === null}
      erro={desempenho.erro}
      aoRecarregar={desempenho.recarregar}
      dentroDasAbas={false}
    >
      {dados ? (
        <>
          <Cartao acento={ACENTO}>
            <View style={estilos.colunas}>
              <View>
                <Texto variante="legenda" cor={cores.tintaFraca}>
                  Média
                </Texto>
                <Texto variante="numeroGrande">
                  {dados.media === null ? '—' : dados.media.toFixed(2)}
                </Texto>
              </View>
              <View>
                <Texto variante="legenda" cor={cores.tintaFraca}>
                  Estudo
                </Texto>
                <Texto variante="tituloMenor">{duracao(dados.estudo.totalMinutos)}</Texto>
                <Texto variante="legenda" cor={cores.tintaFraca}>
                  {dados.estudo.totalSessoes} sessões
                </Texto>
              </View>
            </View>
          </Cartao>

          <Secao titulo="Evolução">
            {dados.progressao.pontos.length < 2 ? (
              <EstadoVazio
                titulo="poucas notas para uma linha"
                descricao="A evolução aparece a partir da segunda avaliação lançada."
              />
            ) : (
              <Cartao>
                <View style={estilos.cabecalhoGrafico}>
                  <Selo
                    texto={TENDENCIA[dados.progressao.tendencia].texto}
                    cor={TENDENCIA[dados.progressao.tendencia].cor}
                  />
                  {dados.progressao.variacao !== null ? (
                    <Texto variante="legenda" cor={cores.tintaMedia}>
                      {dados.progressao.variacao > 0 ? '+' : ''}
                      {dados.progressao.variacao.toFixed(2)} da primeira à última
                    </Texto>
                  ) : null}
                </View>
                <LinhaEvolucao pontos={dados.progressao.pontos} />
              </Cartao>
            )}
          </Secao>

          <Secao titulo="Avaliações">
            {dados.avaliacoes.length === 0 ? (
              <EstadoVazio titulo="nenhuma nota lançada" />
            ) : null}

            {dados.avaliacoes.map((avaliacao) => (
              <View key={avaliacao.id} style={estilos.avaliacao}>
                <View style={estilos.identificacao}>
                  <Texto variante="corpo">{avaliacao.descricao}</Texto>
                  <Texto variante="legenda" cor={cores.tintaFraca}>
                    {dataCurta(avaliacao.data)}
                    {avaliacao.peso !== 1 ? ` · peso ${avaliacao.peso}` : ''}
                    {avaliacao.origem === 'importada' ? ' · importada' : ''}
                  </Texto>
                </View>
                <Texto variante="corpoForte">{avaliacao.valor.toFixed(2)}</Texto>
              </View>
            ))}
          </Secao>
        </>
      ) : null}
    </TelaModulo>
  );
}

/** O texto é o que carrega o sentido; a cor só reforça. */
const TENDENCIA: Record<Tendencia, { texto: string; cor: string }> = {
  subindo: { texto: 'subindo', cor: cores.sucesso },
  caindo: { texto: 'caindo', cor: cores.erro },
  estavel: { texto: 'estável', cor: cores.tintaMedia },
  indefinida: { texto: 'sem tendência', cor: cores.tintaMedia },
};

const estilos = StyleSheet.create({
  colunas: {
    flexDirection: 'row',
    gap: espaco.xxl,
  },
  cabecalhoGrafico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    flexWrap: 'wrap',
  },
  avaliacao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.md,
    paddingVertical: espaco.md,
    borderBottomWidth: 1,
    borderBottomColor: cores.linha,
  },
  identificacao: {
    flex: 1,
    gap: 2,
  },
});
