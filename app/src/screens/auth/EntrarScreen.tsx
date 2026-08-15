/** SD02 — login. */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { useSessao } from '@/contexts/SessaoContext';
import { mensagemDe } from '@/hooks/useRequisicao';
import { TelaAuth } from '@/components/common/TelaAuth';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { Texto } from '@/components/ui/Texto';
import { cores, espaco } from '@/theme';

export function EntrarScreen() {
  const { entrar } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEntrar() {
    setErro(null);
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      // A navegação é reativa: com sessão, o layout do grupo (auth) redireciona.
    } catch (causa) {
      setErro(mensagemDe(causa));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaAuth titulo="Entrar" chamada="Bem-vinda de volta à banca.">
      <View style={estilos.formulario}>
        {erro ? <Aviso mensagem={erro} tom="erro" /> : null}

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
          autoComplete="current-password"
          placeholder="sua senha"
          onSubmitEditing={() => void aoEntrar()}
        />

        <Botao
          titulo="Entrar"
          aoTocar={() => void aoEntrar()}
          carregando={enviando}
          desabilitado={email.trim() === '' || senha === ''}
        />

        <Link href="/recuperar-senha" asChild>
          <Texto variante="corpoForte" cor={cores.lilas} estilo={estilos.link}>
            Esqueci minha senha
          </Texto>
        </Link>
      </View>

      <View style={estilos.rodape}>
        <Texto variante="corpo" cor={cores.tintaMedia}>
          Ainda não tem conta?
        </Texto>
        <Link href="/cadastro" asChild>
          <Texto variante="corpoForte" cor={cores.lilas}>
            Criar conta
          </Texto>
        </Link>
      </View>
    </TelaAuth>
  );
}

const estilos = StyleSheet.create({
  formulario: {
    gap: espaco.lg,
  },
  link: {
    alignSelf: 'center',
  },
  rodape: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espaco.xs,
  },
});
