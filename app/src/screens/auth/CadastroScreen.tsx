/**
 * SD01 — cadastro.
 *
 * A força da senha (RN02) é decidida pelo backend, que devolve exatamente o
 * que falta. Aqui a mesma lista é mostrada enquanto o usuário digita, para ele
 * não descobrir só ao tocar em "Criar conta".
 */

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSessao } from '@/contexts/SessaoContext';
import { mensagemDe } from '@/hooks/useRequisicao';
import { pendenciasDaSenha } from '@/utils/senha';
import { TelaAuth } from '@/components/common/TelaAuth';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { Texto } from '@/components/ui/Texto';
import { cores, espaco } from '@/theme';

export function CadastroScreen() {
  const { cadastrar } = useSessao();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pendencias = useMemo(() => pendenciasDaSenha(senha), [senha]);
  const podeEnviar =
    nome.trim() !== '' && email.trim() !== '' && pendencias.length === 0 && !enviando;

  async function aoCadastrar() {
    setErro(null);
    setEnviando(true);
    try {
      await cadastrar(nome.trim(), email.trim(), senha);
    } catch (causa) {
      setErro(mensagemDe(causa));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaAuth titulo="Criar conta" chamada="Sua rotina inteira num lugar só.">
      <View style={estilos.formulario}>
        {erro ? <Aviso mensagem={erro} tom="erro" /> : null}

        <Campo rotulo="Nome" value={nome} onChangeText={setNome} placeholder="Como te chamam" />
        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="voce@email.com"
        />
        <Campo
          rotulo="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          autoComplete="new-password"
          placeholder="mínimo 8 caracteres"
        />

        <View style={estilos.requisitos}>
          {REQUISITOS.map((requisito) => {
            const cumprido = senha !== '' && !pendencias.includes(requisito);
            return (
              <View key={requisito} style={estilos.requisito}>
                <Feather
                  name={cumprido ? 'check-circle' : 'circle'}
                  size={14}
                  color={cumprido ? cores.sucesso : cores.tintaFraca}
                />
                <Texto variante="legenda" cor={cumprido ? cores.tintaMedia : cores.tintaFraca}>
                  {requisito}
                </Texto>
              </View>
            );
          })}
        </View>

        <Botao
          titulo="Criar conta"
          aoTocar={() => void aoCadastrar()}
          carregando={enviando}
          desabilitado={!podeEnviar}
        />
      </View>

      <View style={estilos.rodape}>
        <Texto variante="corpo" cor={cores.tintaMedia}>
          Já tem conta?
        </Texto>
        <Link href="/entrar" asChild>
          <Texto variante="corpoForte" cor={cores.olive}>
            Entrar
          </Texto>
        </Link>
      </View>
    </TelaAuth>
  );
}

/** RN02, na mesma ordem em que o backend lista. */
const REQUISITOS = [
  'ter no mínimo 8 caracteres',
  'conter ao menos uma letra maiúscula',
  'conter ao menos um número',
  'conter ao menos um caractere especial',
];

const estilos = StyleSheet.create({
  formulario: {
    gap: espaco.lg,
  },
  requisitos: {
    gap: espaco.xs,
  },
  requisito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
  },
  rodape: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espaco.xs,
  },
});
