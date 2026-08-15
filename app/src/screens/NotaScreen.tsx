/**
 * SD06 — leitura de nota fiscal (RF008, RN06, RN18, RN22).
 *
 * A tela tem dois passos porque a nota tem dois passos:
 *
 * 1. **Identificar a nota** — o QR Code dá a chave de acesso, e só ela. Quem
 *    não consegue apontar a câmera (nota amassada, pouca luz, aparelho sem
 *    foco) digita os 44 dígitos.
 * 2. **Conferir os itens** — RN22: os produtos não estão no QR Code, então é o
 *    usuário quem informa o que entrou na despensa.
 *
 * O gasto nasce categorizado como "Mercado" (RN18) e a nota repetida é recusada
 * pela chave (RN06) — as duas regras são do servidor; aqui só se mostra o erro.
 */

import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import * as despensaApi from '@/services/api/despensa';
import { useAcao } from '@/hooks/useAcao';
import { TelaModulo } from '@/components/common/TelaModulo';
import { Secao } from '@/components/common/Secao';
import { Aviso } from '@/components/ui/Aviso';
import { Botao } from '@/components/ui/Botao';
import { Campo } from '@/components/ui/Campo';
import { Cartao } from '@/components/ui/Cartao';
import { Texto } from '@/components/ui/Texto';
import { extrairChaveDeAcesso } from '@/utils/chaveDeAcesso';
import { hoje } from '@/utils/formato';
import { cores, espaco, raio } from '@/theme';

const ACENTO = cores.modulo.despensa;

interface ItemDaNota {
  descricao: string;
  quantidade: string;
  valorUnitario: string;
}

const ITEM_VAZIO: ItemDaNota = { descricao: '', quantidade: '1', valorUnitario: '' };

export function NotaScreen() {
  const router = useRouter();
  const acao = useAcao();

  const [chave, setChave] = useState<string | null>(null);
  const [chaveDigitada, setChaveDigitada] = useState('');
  const [erroDeLeitura, setErroDeLeitura] = useState<string | null>(null);
  const [camerAberta, setCameraAberta] = useState(false);

  const [local, setLocal] = useState('');
  const [data, setData] = useState(hoje());
  const [itens, setItens] = useState<ItemDaNota[]>([{ ...ITEM_VAZIO }]);

  function aoLerCodigo(conteudo: string) {
    const leitura = extrairChaveDeAcesso(conteudo);
    if (!leitura) {
      // Não fecha a câmera: quase sempre é mira, e fechar obrigaria a recomeçar.
      setErroDeLeitura('Esse código não é de uma nota fiscal. Aponte para o QR da NFC-e.');
      return;
    }
    setErroDeLeitura(null);
    setChave(leitura.chave);
    setCameraAberta(false);
  }

  function confirmarChaveDigitada() {
    const leitura = extrairChaveDeAcesso(chaveDigitada);
    if (!leitura) {
      setErroDeLeitura('A chave de acesso tem 44 dígitos.');
      return;
    }
    setErroDeLeitura(null);
    setChave(leitura.chave);
  }

  const itensValidos = itens
    .map((item) => ({
      descricao: item.descricao.trim(),
      quantidade: Number(item.quantidade.replace(',', '.')),
      valorUnitario: Number(item.valorUnitario.replace(',', '.')),
    }))
    .filter(
      (item) =>
        item.descricao !== '' && item.quantidade > 0 && Number.isFinite(item.valorUnitario),
    );

  async function enviar() {
    if (!chave) return;
    const resultado = await acao.executar(() =>
      despensaApi.processarNota({
        chaveAcesso: chave,
        localCompra: local.trim() || null,
        dataCompra: data,
        itens: itensValidos,
      }),
    );
    if (resultado) router.back();
  }

  return (
    <TelaModulo
      titulo="Ler nota"
      chamada={chave ? 'confira o que entrou' : 'aponte para o QR Code'}
      modulo="despensa"
      dentroDasAbas={false}
    >
      {acao.erro ? <Aviso mensagem={acao.erro} tom="erro" /> : null}
      {erroDeLeitura ? <Aviso mensagem={erroDeLeitura} tom="atencao" /> : null}

      {chave === null ? (
        <PassoDaChave
          cameraAberta={camerAberta}
          aoAbrirCamera={() => {
            setErroDeLeitura(null);
            setCameraAberta(true);
          }}
          aoFecharCamera={() => setCameraAberta(false)}
          aoLerCodigo={aoLerCodigo}
          chaveDigitada={chaveDigitada}
          aoDigitarChave={setChaveDigitada}
          aoConfirmarDigitada={confirmarChaveDigitada}
        />
      ) : (
        <>
          <Cartao acento={ACENTO}>
            <Texto variante="corpo" cor={cores.tintaMedia}>
              Nota identificada
            </Texto>
            {/* Em blocos de 4, que é como a chave é impressa na nota. */}
            <Texto variante="corpoForte">{chave.replace(/(\d{4})/g, '$1 ').trim()}</Texto>
            <Botao
              titulo="Ler outra"
              aparencia="texto"
              compacto
              aoTocar={() => {
                setChave(null);
                setChaveDigitada('');
              }}
            />
          </Cartao>

          <Secao titulo="Itens">
            {/* RN22 — o QR não traz os produtos; quem informa é o usuário. */}
            <Texto variante="corpo" cor={cores.tintaMedia}>
              O QR Code identifica a nota, mas não lista os produtos. Informe o que entrou na
              despensa.
            </Texto>

            {itens.map((item, indice) => (
              <Cartao key={indice}>
                <Campo
                  rotulo="Produto"
                  value={item.descricao}
                  onChangeText={(texto) => atualizarItem(setItens, indice, { descricao: texto })}
                  placeholder="Arroz"
                />
                <View style={estilos.duasColunas}>
                  <View style={estilos.metade}>
                    <Campo
                      rotulo="Quantidade"
                      value={item.quantidade}
                      onChangeText={(texto) =>
                        atualizarItem(setItens, indice, { quantidade: texto })
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={estilos.metade}>
                    <Campo
                      rotulo="Valor unitário"
                      value={item.valorUnitario}
                      onChangeText={(texto) =>
                        atualizarItem(setItens, indice, { valorUnitario: texto })
                      }
                      keyboardType="decimal-pad"
                      placeholder="0,00"
                    />
                  </View>
                </View>
                {itens.length > 1 ? (
                  <Botao
                    titulo="Remover"
                    aparencia="texto"
                    compacto
                    aoTocar={() => setItens((atuais) => atuais.filter((_, i) => i !== indice))}
                  />
                ) : null}
              </Cartao>
            ))}

            <Botao
              titulo="Mais um item"
              aparencia="contorno"
              compacto
              aoTocar={() => setItens((atuais) => [...atuais, { ...ITEM_VAZIO }])}
            />
          </Secao>

          <Secao titulo="Da nota">
            <Campo
              rotulo="Onde foi a compra"
              value={local}
              onChangeText={setLocal}
              placeholder="Mercado do Zé"
            />
            <Campo rotulo="Data da compra" value={data} onChangeText={setData} placeholder="AAAA-MM-DD" />
          </Secao>

          <Botao
            titulo={`Lançar ${itensValidos.length} item(ns)`}
            carregando={acao.executando}
            desabilitado={itensValidos.length === 0}
            aoTocar={() => void enviar()}
          />
          {/* RN18 — o gasto da nota nasce em "Mercado"; dizer isso evita surpresa. */}
          <Texto variante="legenda" cor={cores.tintaFraca}>
            O total entra como gasto na categoria “Mercado”.
          </Texto>
        </>
      )}
    </TelaModulo>
  );
}

function PassoDaChave({
  cameraAberta,
  aoAbrirCamera,
  aoFecharCamera,
  aoLerCodigo,
  chaveDigitada,
  aoDigitarChave,
  aoConfirmarDigitada,
}: {
  cameraAberta: boolean;
  aoAbrirCamera(): void;
  aoFecharCamera(): void;
  aoLerCodigo(conteudo: string): void;
  chaveDigitada: string;
  aoDigitarChave(texto: string): void;
  aoConfirmarDigitada(): void;
}) {
  const [permissao, pedirPermissao] = useCameraPermissions();

  return (
    <>
      <Secao titulo="Escanear">
        {cameraAberta && permissao?.granted ? (
          <View style={estilos.camera}>
            <CameraView
              style={estilos.visor}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => aoLerCodigo(data)}
            />
            <View style={estilos.mira} pointerEvents="none" />
            <Botao titulo="Cancelar" aparencia="texto" compacto aoTocar={aoFecharCamera} />
          </View>
        ) : (
          <Pressable
            onPress={async () => {
              // Pedir na hora do uso, não na abertura da tela: a permissão faz
              // sentido para quem acabou de dizer que quer escanear.
              if (!permissao?.granted) {
                const resposta = await pedirPermissao();
                if (!resposta.granted) return;
              }
              aoAbrirCamera();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.alvo, pressed && estilos.pressionado]}
          >
            <Feather name="maximize" size={34} color={ACENTO} />
            <Texto variante="corpoForte">Abrir a câmera</Texto>
            <Texto variante="legenda" cor={cores.tintaMedia}>
              {permissao?.granted === false
                ? 'Sem permissão de câmera — dá para digitar a chave abaixo.'
                : 'Aponte para o QR Code impresso na nota.'}
            </Texto>
          </Pressable>
        )}
      </Secao>

      <Secao titulo="Ou digite a chave">
        <Campo
          rotulo="Chave de acesso"
          value={chaveDigitada}
          onChangeText={aoDigitarChave}
          keyboardType="number-pad"
          placeholder="44 dígitos impressos na nota"
        />
        <Botao
          titulo="Usar esta chave"
          aparencia="contorno"
          desabilitado={chaveDigitada.replace(/\D/g, '').length !== 44}
          aoTocar={aoConfirmarDigitada}
        />
        {Platform.OS === 'android' ? (
          <Texto variante="legenda" cor={cores.tintaFraca}>
            No emulador a câmera não lê QR de verdade: use este campo para testar o fluxo.
          </Texto>
        ) : null}
      </Secao>
    </>
  );
}

function atualizarItem(
  setItens: React.Dispatch<React.SetStateAction<ItemDaNota[]>>,
  indice: number,
  mudanca: Partial<ItemDaNota>,
) {
  setItens((atuais) =>
    atuais.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)),
  );
}

const estilos = StyleSheet.create({
  camera: {
    gap: espaco.md,
  },
  visor: {
    height: 280,
    borderRadius: raio.lg,
    overflow: 'hidden',
  },
  mira: {
    position: 'absolute',
    top: 60,
    left: '18%',
    right: '18%',
    height: 160,
    borderWidth: 2,
    borderColor: cores.branco,
    borderRadius: raio.md,
    opacity: 0.9,
  },
  alvo: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.sm,
    paddingVertical: espaco.xxl,
    backgroundColor: cores.superficie,
    borderWidth: 1,
    borderColor: cores.linha,
    borderStyle: 'dashed',
    borderRadius: raio.lg,
  },
  pressionado: {
    opacity: 0.7,
  },
  duasColunas: {
    flexDirection: 'row',
    gap: espaco.md,
  },
  metade: {
    flex: 1,
  },
});
