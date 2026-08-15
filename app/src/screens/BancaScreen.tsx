/**
 * A banca — a home.
 *
 * Não é um módulo: é o resumo do que os outros quatro têm de urgente hoje. A
 * "sacola" (o resumo do mês, RF018/RN11) fica no topo; abaixo dela só entra o
 * que pede ação — reposição de estoque (RN08), orçamento no limite (RN12),
 * peça no limite de usos (RN14) e insumo de lavanderia em falta (RN13).
 */

import { StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as cabecaApi from '@/services/api/cabeca';
import * as despensaApi from '@/services/api/despensa';
import * as granaApi from '@/services/api/grana';
import * as roupaApi from '@/services/api/roupa';
import { useRequisicao } from '@/hooks/useRequisicao';
import { useSessao } from '@/contexts/SessaoContext';
import { TelaModulo } from '@/components/common/TelaModulo';
import { Secao } from '@/components/common/Secao';
import { Aviso } from '@/components/ui/Aviso';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoVazio } from '@/components/ui/Estados';
import { Selo } from '@/components/ui/Selo';
import { Texto } from '@/components/ui/Texto';
import { cores, espaco, raio, sombra } from '@/theme';
import { dinheiro, mesAtual, mesPorExtenso, primeiroNome, quantidade } from '@/utils/formato';

export function BancaScreen() {
  const { perfil } = useSessao();
  const router = useRouter();

  const { dados, carregando, erro, recarregar } = useRequisicao(async () => {
    const [resumo, orcamentos, alertasDespensa, paraLavar, alertasRoupa, panorama] =
      await Promise.all([
        granaApi.obterResumo(),
        granaApi.listarOrcamentos(),
        despensaApi.listarAlertas(),
        roupaApi.listarParaLavar(),
        roupaApi.obterAlertas(),
        cabecaApi.obterPanorama(),
      ]);
    return { resumo, orcamentos, alertasDespensa, paraLavar, alertasRoupa, panorama };
  }, []);

  const orcamentosEmAlerta = dados?.orcamentos.orcamentos.filter((o) => o.emAlerta) ?? [];
  const semPendencia =
    dados !== null &&
    dados.alertasDespensa.produtos.length === 0 &&
    dados.paraLavar.pecas.length === 0 &&
    dados.alertasRoupa.faltando.length === 0 &&
    orcamentosEmAlerta.length === 0;

  return (
    <TelaModulo
      titulo="A banca"
      chamada={perfil ? `oi, ${primeiroNome(perfil.nome)}` : undefined}
      modulo="banca"
      carregando={carregando && dados === null}
      erro={erro}
      aoRecarregar={recarregar}
    >
      {dados ? (
        <>
          {/*
            O lugar do banner do template na home. Aqui ele é preenchido na
            primária porque é o único bloco cheio da tela — o resto é branco
            sobre o fundo, como no template.
          */}
          <View style={estilos.sacola}>
            <View style={estilos.linhaTopo}>
              <Texto variante="rotuloCampo" cor={cores.lilasTinta}>
                A sacola
              </Texto>
              <Texto variante="corpo" cor={cores.lilasTinta}>
                {mesPorExtenso(mesAtual())}
              </Texto>
            </View>

            <Texto variante="numeroGrande" cor={cores.branco}>
              {dinheiro(dados.resumo.saidas)}
            </Texto>
            <Texto variante="corpo" cor={cores.lilasTinta}>
              gasto no mês
            </Texto>

            <View style={estilos.colunas}>
              <View style={estilos.coluna}>
                <Texto variante="legenda" cor={cores.lilasTinta}>
                  Entrou
                </Texto>
                <Texto variante="corpoForte" cor={cores.branco}>
                  {dinheiro(dados.resumo.entradas)}
                </Texto>
              </View>
              <View style={estilos.coluna}>
                <Texto variante="legenda" cor={cores.lilasTinta}>
                  Sobrou
                </Texto>
                {/*
                  Vermelho/verde não sobrevivem ao fundo lilás, mas o sinal de
                  saldo negativo não pode sumir: o rosa pálido é o que lê como
                  alerta sobre a primária.
                */}
                <Texto
                  variante="corpoForte"
                  cor={dados.resumo.resultado < 0 ? cores.erroTinta : cores.branco}
                >
                  {dinheiro(dados.resumo.resultado)}
                </Texto>
              </View>
              <View style={estilos.coluna}>
                <Texto variante="legenda" cor={cores.lilasTinta}>
                  Nas contas
                </Texto>
                <Texto variante="corpoForte" cor={cores.branco}>
                  {dinheiro(dados.resumo.saldoTotal)}
                </Texto>
              </View>
            </View>
          </View>

          <Secao titulo="Precisa de você">
            {semPendencia ? (
              <EstadoVazio
                titulo="tudo em dia"
                descricao="Nada pedindo atenção agora. Aproveita e descansa."
              />
            ) : null}

            {orcamentosEmAlerta.map((orcamento) => (
              <Aviso
                key={orcamento.id}
                tom={orcamento.estourado ? 'erro' : 'atencao'}
                mensagem={
                  orcamento.estourado
                    ? `Orçamento de ${orcamento.categoria.nome} estourado: ${dinheiro(orcamento.gasto)} de ${dinheiro(orcamento.valorLimite)}.`
                    : `${orcamento.percentual}% do orçamento de ${orcamento.categoria.nome} já foi.`
                }
              />
            ))}

            {dados.alertasDespensa.produtos.length > 0 ? (
              <Cartao acento={cores.modulo.despensa} aoTocar={() => router.push('/despensa')}>
                <View style={estilos.linhaTopo}>
                  <Texto variante="corpoForte">Repor na despensa</Texto>
                  <Selo
                    texto={String(dados.alertasDespensa.produtos.length)}
                    cor={cores.modulo.despensa}
                    preenchido
                  />
                </View>
                <Texto variante="legenda" cor={cores.tintaMedia}>
                  {dados.alertasDespensa.produtos
                    .map(
                      (produto) =>
                        `${produto.nome} (${quantidade(produto.quantidadeAtual, produto.unidade)})`,
                    )
                    .join(', ')}
                </Texto>
              </Cartao>
            ) : null}

            {dados.paraLavar.pecas.length > 0 ? (
              <Cartao acento={cores.modulo.roupa} aoTocar={() => router.push('/roupa')}>
                <View style={estilos.linhaTopo}>
                  <Texto variante="corpoForte">Hora de lavar</Texto>
                  <Selo
                    texto={String(dados.paraLavar.pecas.length)}
                    cor={cores.modulo.roupa}
                    preenchido
                  />
                </View>
                <Texto variante="legenda" cor={cores.tintaMedia}>
                  {dados.paraLavar.pecas.map((peca) => peca.nome).join(', ')}
                </Texto>
              </Cartao>
            ) : null}

            {dados.alertasRoupa.mensagem ? (
              <Aviso tom="atencao" mensagem={dados.alertasRoupa.mensagem} />
            ) : null}
          </Secao>

          <Secao titulo="Na cabeça">
            <Cartao acento={cores.modulo.cabeca} aoTocar={() => router.push('/cabeca')}>
              <View style={estilos.linhaTopo}>
                <View style={estilos.coluna}>
                  <Texto variante="legenda" cor={cores.tintaFraca}>
                    Média geral
                  </Texto>
                  <Texto variante="tituloMenor">
                    {dados.panorama.mediaGeral === null ? '—' : dados.panorama.mediaGeral.toFixed(2)}
                  </Texto>
                </View>
                <View style={estilos.coluna}>
                  <Texto variante="legenda" cor={cores.tintaFraca}>
                    Matérias
                  </Texto>
                  <Texto variante="tituloMenor">{dados.panorama.materias.length}</Texto>
                </View>
                <Feather name="chevron-right" size={20} color={cores.tintaFraca} />
              </View>
            </Cartao>
          </Secao>

          <Link href="/perfil" asChild>
            <Texto variante="corpoForte" cor={cores.lilas} estilo={estilos.perfil}>
              Meu perfil
            </Texto>
          </Link>
        </>
      ) : null}
    </TelaModulo>
  );
}

const estilos = StyleSheet.create({
  sacola: {
    backgroundColor: cores.lilas,
    borderRadius: raio.lg,
    padding: espaco.xl,
    gap: espaco.sm,
    ...sombra.cartao,
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
  colunas: {
    flexDirection: 'row',
    gap: espaco.xl,
    borderTopWidth: 1,
    // Filete claro por cima da primária — o cinza do tema sumiria aqui.
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
    paddingTop: espaco.md,
    marginTop: espaco.xs,
  },
  coluna: {
    gap: 2,
  },
  perfil: {
    alignSelf: 'center',
    paddingVertical: espaco.md,
  },
});
