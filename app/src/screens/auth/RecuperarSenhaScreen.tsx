/**
 * SD04 — pedido de recuperação de senha.
 *
 * O backend responde igual exista o e-mail ou não, para não revelar quais
 * e-mails têm conta; a tela repete essa neutralidade na mensagem de sucesso.
 * A redefinição em si chega pelo link do e-mail (`xepa://redefinir-senha`).
 */

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import * as contaApi from '@/services/api/conta';
import { mensagemDe } from '@/hooks/useRequisicao';
import { TelaAuth } from '@/components/common/TelaAuth';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { Texto } from '@/components/ui/Texto';
import { cores, espaco } from '@/theme';

export function RecuperarSenhaScreen() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar() {
    setErro(null);
    setEnviando(true);
    try {
      await contaApi.pedirRecuperacao(email.trim());
      setEnviado(true);
    } catch (causa) {
      setErro(mensagemDe(causa));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaAuth
      titulo="Recuperar senha"
      chamada="Mandamos um link para você escolher uma nova."
    >
      <View style={estilos.formulario}>
        {erro ? <Aviso mensagem={erro} tom="erro" /> : null}

        {enviado ? (
          <Aviso
            tom="sucesso"
            mensagem={
              'Se existir uma conta com esse e-mail, o link já está a caminho. ' +
              'Ele vale por 30 minutos.'
            }
          />
        ) : (
          <>
            <Campo
              rotulo="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="voce@email.com"
            />
            <Botao
              titulo="Enviar link"
              aoTocar={() => void aoEnviar()}
              carregando={enviando}
              desabilitado={email.trim() === ''}
            />
          </>
        )}
      </View>

      <View style={estilos.rodape}>
        <Link href="/entrar" asChild>
          <Texto variante="corpoForte" cor={cores.olive}>
            Voltar para o login
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
  rodape: {
    marginTop: 'auto',
    alignItems: 'center',
  },
});
