/**
 * Módulo 2 — Despensa (SD07–SD10).
 *
 * A tela é a lista do estoque com duas ações no lugar onde o usuário já está
 * olhando: dar baixa no que consumiu (SD08) e cadastrar item novo (SD07). O
 * alerta de reposição (RN08) chega junto da resposta da baixa, não numa
 * consulta separada.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as despensaApi from '@/services/api/despensa';
import type { Produto } from '@/types/api';
import { useRequisicao } from '@/hooks/useRequisicao';
import { useAcao } from '@/hooks/useAcao';
import { TelaModulo } from '@/components/common/TelaModulo';
import { Secao } from '@/components/common/Secao';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { Cartao } from '@/components/ui/Cartao';
import { EstadoVazio } from '@/components/ui/Estados';
import { Selo } from '@/components/ui/Selo';
import { Texto } from '@/components/ui/Texto';
import { cores, espaco } from '@/theme';
import { quantidade } from '@/utils/formato';

const ACENTO = cores.modulo.despensa;

export function DespensaScreen() {
  const estoque = useRequisicao(() => despensaApi.listarEstoque(), []);
  const acao = useAcao();
  const [novoAberto, setNovoAberto] = useState(false);

  const produtos = estoque.dados?.produtos ?? [];
  const emAlerta = produtos.filter((produto) => produto.emAlerta);

  async function consumir(produto: Produto, valor: number) {
    const resultado = await acao.executar(
      () => despensaApi.registrarConsumo(produto.id, valor),
      // RN08 — o pedido de reposição vem na própria resposta da baixa.
      (r) => r.alertaReposicao?.mensagem ?? null,
    );
    if (resultado) await estoque.recarregar();
  }

  return (
    <TelaModulo
      titulo="Despensa"
      chamada="o que tem em casa"
      modulo="despensa"
      carregando={estoque.carregando && estoque.dados === null}
      erro={estoque.erro}
      aoRecarregar={estoque.recarregar}
    >
      {acao.erro ? <Aviso mensagem={acao.erro} tom="erro" /> : null}
      {acao.aviso ? <Aviso mensagem={acao.aviso} tom="atencao" /> : null}

      {emAlerta.length > 0 ? (
        <Aviso
          tom="atencao"
          mensagem={
            emAlerta.length === 1
              ? `${emAlerta[0]!.nome} está no limite que você definiu.`
              : `${emAlerta.length} itens no limite que você definiu.`
          }
        />
      ) : null}

      <Secao
        titulo="Estoque"
        acao={
          <Botao
            titulo={novoAberto ? 'Fechar' : 'Novo item'}
            aparencia="contorno"
            compacto
            aoTocar={() => setNovoAberto((aberto) => !aberto)}
          />
        }
      >
        {novoAberto ? (
          <FormularioNovoProduto
            executando={acao.executando}
            aoSalvar={async (dados) => {
              const criado = await acao.executar(() => despensaApi.criarProduto(dados));
              if (criado) {
                setNovoAberto(false);
                await estoque.recarregar();
              }
            }}
          />
        ) : null}

        {produtos.length === 0 && !estoque.carregando ? (
          <EstadoVazio
            titulo="despensa vazia"
            descricao="Cadastre o que você tem em casa ou leia o QR Code de uma nota."
          />
        ) : null}

        {produtos.map((produto) => (
          <LinhaProduto
            key={produto.id}
            produto={produto}
            ocupado={acao.executando}
            aoConsumir={(valor) => void consumir(produto, valor)}
          />
        ))}
      </Secao>
    </TelaModulo>
  );
}

function LinhaProduto({
  produto,
  ocupado,
  aoConsumir,
}: {
  produto: Produto;
  ocupado: boolean;
  aoConsumir(quantidade: number): void;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState('1');

  return (
    <Cartao acento={produto.emAlerta ? cores.atencao : ACENTO}>
      <View style={estilos.linha}>
        <View style={estilos.identificacao}>
          <Texto variante="corpoForte">{produto.nome}</Texto>
          {produto.categoria ? (
            <Texto variante="legenda" cor={cores.tintaFraca}>
              {produto.categoria}
            </Texto>
          ) : null}
        </View>

        <View style={estilos.numeros}>
          <Texto variante="tituloMenor" cor={produto.emAlerta ? cores.atencao : cores.tinta}>
            {quantidade(produto.quantidadeAtual)}
          </Texto>
          <Texto variante="legenda" cor={cores.tintaFraca}>
            {produto.unidade}
          </Texto>
        </View>
      </View>

      <View style={estilos.linha}>
        <View style={estilos.selos}>
          {produto.emAlerta ? <Selo texto="repor" cor={cores.atencao} preenchido /> : null}
          {produto.monitorado && produto.quantidadeMinima !== null ? (
            <Selo texto={`mín. ${quantidade(produto.quantidadeMinima)}`} />
          ) : null}
        </View>

        <Botao
          titulo={aberto ? 'Cancelar' : 'Consumi'}
          aparencia="texto"
          compacto
          aoTocar={() => setAberto((estava) => !estava)}
        />
      </View>

      {aberto ? (
        <View style={estilos.baixa}>
          <View style={estilos.campoBaixa}>
            <Campo
              rotulo={`Quanto saiu (${produto.unidade})`}
              value={valor}
              onChangeText={setValor}
              keyboardType="decimal-pad"
            />
          </View>
          <Botao
            titulo="Dar baixa"
            compacto
            carregando={ocupado}
            desabilitado={!(Number(valor.replace(',', '.')) > 0)}
            aoTocar={() => {
              aoConsumir(Number(valor.replace(',', '.')));
              setAberto(false);
              setValor('1');
            }}
          />
        </View>
      ) : null}
    </Cartao>
  );
}

interface DadosNovoProduto {
  nome: string;
  unidade: string;
  quantidadeInicial: number;
  monitorado: boolean;
  quantidadeMinima: number | null;
}

function FormularioNovoProduto({
  executando,
  aoSalvar,
}: {
  executando: boolean;
  aoSalvar(dados: DadosNovoProduto): Promise<void>;
}) {
  const [nome, setNome] = useState('');
  const [unidade, setUnidade] = useState('un');
  const [quantidadeInicial, setQuantidadeInicial] = useState('0');
  const [minima, setMinima] = useState('');

  // RN08 — informar a mínima é o que liga o monitoramento do item.
  const monitorado = minima.trim() !== '';

  return (
    <Cartao acento={ACENTO}>
      <Campo rotulo="Item" value={nome} onChangeText={setNome} placeholder="Arroz" />
      <View style={estilos.duasColunas}>
        <View style={estilos.metade}>
          <Campo rotulo="Unidade" value={unidade} onChangeText={setUnidade} placeholder="kg" />
        </View>
        <View style={estilos.metade}>
          <Campo
            rotulo="Quantidade"
            value={quantidadeInicial}
            onChangeText={setQuantidadeInicial}
            keyboardType="decimal-pad"
          />
        </View>
      </View>
      <Campo
        rotulo="Avisar quando chegar em"
        value={minima}
        onChangeText={setMinima}
        keyboardType="decimal-pad"
        dica="Deixe vazio para não monitorar este item."
      />
      <Botao
        titulo="Cadastrar"
        carregando={executando}
        desabilitado={nome.trim() === ''}
        aoTocar={() =>
          void aoSalvar({
            nome: nome.trim(),
            unidade: unidade.trim() || 'un',
            quantidadeInicial: Number(quantidadeInicial.replace(',', '.')) || 0,
            monitorado,
            quantidadeMinima: monitorado ? Number(minima.replace(',', '.')) : null,
          })
        }
      />
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
  identificacao: {
    flex: 1,
    gap: 2,
  },
  numeros: {
    alignItems: 'flex-end',
  },
  selos: {
    flexDirection: 'row',
    gap: espaco.sm,
    flexWrap: 'wrap',
    flex: 1,
  },
  baixa: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: espaco.md,
    borderTopWidth: 1,
    borderTopColor: cores.linha,
    paddingTop: espaco.md,
  },
  campoBaixa: {
    flex: 1,
  },
  duasColunas: {
    flexDirection: 'row',
    gap: espaco.md,
  },
  metade: {
    flex: 1,
  },
});
