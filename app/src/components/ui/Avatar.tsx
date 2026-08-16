/**
 * Medalhão de avatar (RF007/RN04).
 *
 * A API guarda o avatar como um registro com `descricao` e `url`
 * (`avatares/feira.png`), mas nenhum servidor publica esses arquivos — não há
 * upload próprio nem CDN. Em vez de pedir uma imagem que não existe, cada
 * avatar do seed é desenhado aqui como ícone, casado pelo nome do arquivo.
 *
 * Ícone e não texto: o avatar é identidade, e identidade se reconhece de
 * relance. Sem avatar escolhido, cai na inicial do nome — que já é melhor que
 * um espaço vazio.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Avatar as AvatarDaApi } from '@/types/api';
import { cores } from '@/theme';
import { Texto } from '@/components/ui/Texto';

type NomeDeIcone = keyof typeof Ionicons.glyphMap;

/**
 * Casamento entre o avatar do seed (`001_dados_de_apoio.sql`) e o desenho.
 *
 * A chave é o nome do arquivo sem extensão, não o id: id de seed muda entre
 * bancos, o arquivo não.
 */
const ICONES: Record<string, NomeDeIcone> = {
  feira: 'basket-outline',
  caixote: 'cube-outline',
  sacola: 'bag-handle-outline',
  banca: 'storefront-outline',
  panela: 'restaurant-outline',
  caderno: 'book-outline',
  cafezinho: 'cafe-outline',
  varal: 'shirt-outline',
};

/** `avatares/feira.png` → `feira`. */
function chaveDo(avatar: AvatarDaApi): string {
  const arquivo = avatar.url.split('/').pop() ?? '';
  return arquivo.replace(/\.[^.]+$/, '').toLowerCase();
}

export function iconeDoAvatar(avatar: AvatarDaApi | null | undefined): NomeDeIcone | null {
  if (!avatar) return null;
  return ICONES[chaveDo(avatar)] ?? 'person-outline';
}

interface Props {
  avatar: AvatarDaApi | null | undefined;
  /** Só para o recuo: a inicial de quem não escolheu avatar. */
  nome?: string | undefined;
  tamanho?: number;
  /** Invertido: fundo cheio e traço branco, para o estado escolhido. */
  destacado?: boolean;
}

export function Avatar({ avatar, nome, tamanho = 64, destacado = false }: Props) {
  const icone = iconeDoAvatar(avatar);
  const tinta = destacado ? cores.branco : cores.lilasForte;

  return (
    <View
      style={[
        estilos.medalhao,
        {
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: destacado ? cores.lilas : cores.lilasTinta,
        },
      ]}
    >
      {icone ? (
        <Ionicons name={icone} size={Math.round(tamanho * 0.5)} color={tinta} />
      ) : (
        <Texto variante="tituloMenor" cor={tinta}>
          {nome?.trim().charAt(0).toUpperCase() ?? '?'}
        </Texto>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  medalhao: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
