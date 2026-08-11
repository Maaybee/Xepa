/**
 * SD05 — perfil, avatar (RF007/RN04) e vínculo institucional (RF006/RN05).
 *
 * O avatar sai da lista que a API devolve — não há upload próprio (RN04). O
 * vínculo institucional é o que destrava a importação de notas (RF023), que na
 * prática quase nunca está disponível.
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as contaApi from '@/services/api/conta';
import { useSessao } from '@/contexts/SessaoContext';
import { useRequisicao } from '@/hooks/useRequisicao';
import { useAcao } from '@/hooks/useAcao';
import { TelaModulo } from '@/components/common/TelaModulo';
import { Secao } from '@/components/common/Secao';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { Cartao } from '@/components/ui/Cartao';
import { Texto } from '@/components/ui/Texto';
import { cores, espaco, raio } from '@/theme';

export function PerfilScreen() {
  const { perfil, definirPerfil, sair } = useSessao();
  const router = useRouter();
  const acao = useAcao();

  const apoio = useRequisicao(async () => {
    const [avatares, instituicoes] = await Promise.all([
      contaApi.listarAvatares(),
      contaApi.listarInstituicoes(),
    ]);
    return { avatares, instituicoes };
  }, []);

  const [salvandoVinculo, setSalvandoVinculo] = useState(false);

  async function atualizar(dados: { avatarId?: number | null; instituicaoId?: number | null }) {
    setSalvandoVinculo(true);
    const resultado = await acao.executar(() => contaApi.atualizarPerfil(dados));
    if (resultado) definirPerfil(resultado.usuario);
    setSalvandoVinculo(false);
  }

  return (
    <TelaModulo
      titulo="Perfil"
      chamada={perfil?.email}
      modulo="banca"
      erro={apoio.erro}
      aoRecarregar={apoio.recarregar}
      dentroDasAbas={false}
    >
      {acao.erro ? <Aviso mensagem={acao.erro} tom="erro" /> : null}

      <Cartao>
        <Texto variante="secao" cor={cores.tintaFraca} maiusculas>
          Conta
        </Texto>
        <Texto variante="tituloMenor">{perfil?.nome}</Texto>
        <Texto variante="corpo" cor={cores.tintaMedia}>
          {perfil?.email}
        </Texto>
      </Cartao>

      <Secao titulo="Avatar">
        <View style={estilos.grade}>
          {(apoio.dados?.avatares.avatares ?? []).map((avatar) => {
            const escolhido = perfil?.avatar?.id === avatar.id;
            return (
              <Texto
                key={avatar.id}
                variante="legenda"
                cor={escolhido ? cores.papel : cores.tintaMedia}
                onPress={() => void atualizar({ avatarId: escolhido ? null : avatar.id })}
                estilo={[
                  estilos.opcao,
                  escolhido ? { backgroundColor: cores.olive, borderColor: cores.olive } : null,
                ]}
              >
                {avatar.descricao}
              </Texto>
            );
          })}
        </View>
      </Secao>

      <Secao titulo="Instituição de ensino">
        <Texto variante="legenda" cor={cores.tintaFraca}>
          O vínculo é o que permite tentar importar notas (RF023, RN05).
        </Texto>
        <View style={estilos.grade}>
          {(apoio.dados?.instituicoes.instituicoes ?? []).map((instituicao) => {
            const escolhida = perfil?.instituicao?.id === instituicao.id;
            return (
              <Texto
                key={instituicao.id}
                variante="legenda"
                cor={escolhida ? cores.papel : cores.tintaMedia}
                onPress={() =>
                  void atualizar({ instituicaoId: escolhida ? null : instituicao.id })
                }
                estilo={[
                  estilos.opcao,
                  escolhida ? { backgroundColor: cores.olive, borderColor: cores.olive } : null,
                ]}
              >
                {instituicao.nome}
              </Texto>
            );
          })}
        </View>
      </Secao>

      <Botao
        titulo="Sair da conta"
        aparencia="perigo"
        desabilitado={salvandoVinculo}
        aoTocar={() => {
          void (async () => {
            // RN03 — o logout invalida o token no servidor.
            await sair();
            router.replace('/entrar');
          })();
        }}
      />
    </TelaModulo>
  );
}

const estilos = StyleSheet.create({
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  opcao: {
    borderWidth: 1,
    borderColor: cores.linhaForte,
    borderRadius: raio.pilula,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    overflow: 'hidden',
  },
});
