/**
 * Consulta de nota fiscal (RF008, RN22) — o que adianta a digitação dos itens.
 *
 * A leitura do QR Code continua identificando a nota; o que muda é que, antes
 * de pedir os itens ao usuário, o sistema tenta buscá-los na consulta pública
 * da SEFAZ. É uma tentativa, não uma etapa obrigatória: o resultado sempre
 * diz se veio ou não, e o app segue para o preenchimento manual quando não
 * veio. Nenhum caminho depende do portal estar de pé.
 *
 * A escolha do provedor é pelo código de UF, que são os dois primeiros dígitos
 * da chave de acesso. Hoje só São Paulo tem implementação — cada estado publica
 * a consulta em domínio e HTML próprios, então um estado a mais é um arquivo a
 * mais em `notaFiscal/`, e mais nada.
 */

import type { ItemConsultado, NotaConsultada, ProvedorNotaFiscal } from './notaFiscal/provedor.js';
import { ProvedorSefazSp } from './notaFiscal/sefazSp.js';
import { sugerirProduto, type Sugestao } from './notaFiscal/similaridade.js';
import * as produtoRepository from '../repositories/produtoRepository.js';
import { badRequest } from '../utils/errors.js';

/**
 * Os provedores em uso, por UF. Somar um estado é somar uma linha aqui —
 * nada abaixo desta lista muda.
 */
const PROVEDORES: ProvedorNotaFiscal[] = [new ProvedorSefazSp()];

/** Item da nota já confrontado com a despensa de quem leu. */
export interface ItemSugerido extends ItemConsultado {
  /**
   * O produto que já existe e provavelmente é este (RN22).
   *
   * `null` significa "não sei", nunca "é novo": quem decide é o usuário, na
   * conferência. O nome sugerido só entra no estoque se ele confirmar.
   */
  sugestao: Sugestao | null;
}

export interface NotaSugerida extends Omit<NotaConsultada, 'itens'> {
  itens: ItemSugerido[];
}

export interface ResultadoDaConsulta {
  /** `false` quando não deu: o app pede os itens ao usuário. */
  consultada: boolean;
  chaveAcesso: string;
  nota: NotaSugerida | null;
  /** Por que não deu — texto para o usuário, não código de erro. */
  motivo: string | null;
}

/** UF do emissor: os dois primeiros dígitos da chave (35 = SP). */
export function ufDaChave(chaveAcesso: string): number {
  return Number(chaveAcesso.slice(0, 2));
}

export function provedorPara(chaveAcesso: string): ProvedorNotaFiscal | null {
  const uf = ufDaChave(chaveAcesso);
  return PROVEDORES.find((provedor) => provedor.uf === uf) ?? null;
}

/**
 * SD06 — tenta trazer os itens da nota lida.
 *
 * Recebe o conteúdo cru do QR Code porque é dele que sai o hash de validação
 * que o portal exige; a chave sozinha cairia na consulta com captcha.
 */
export async function consultar(
  usuarioId: number,
  conteudoQr: string,
  chaveAcesso: string,
): Promise<ResultadoDaConsulta> {
  if (!/^\d{44}$/.test(chaveAcesso)) {
    throw badRequest('A chave de acesso deve ter 44 dígitos.');
  }

  const provedor = provedorPara(chaveAcesso);
  if (!provedor) {
    return {
      consultada: false,
      chaveAcesso,
      nota: null,
      motivo: 'A busca automática de itens ainda só vale para notas de São Paulo.',
    };
  }

  const nota = await provedor.consultar(conteudoQr, chaveAcesso);
  if (!nota) {
    return {
      consultada: false,
      chaveAcesso,
      nota: null,
      motivo: `Não deu para ler os itens no portal da ${provedor.nome} agora.`,
    };
  }

  return {
    consultada: true,
    chaveAcesso,
    nota: { ...nota, itens: await casarComADespensa(usuarioId, nota.itens) },
    motivo: null,
  };
}

/**
 * Aponta, para cada item da nota, o produto que já está na despensa (RN22).
 *
 * O PDV trunca a descrição e a conciliação do estoque é por nome exato, então
 * sem isto a mesma compra semanal criaria "MAION HELLMANNS 500G TRA" ao lado da
 * "maionese" que já existe — e o alerta de reposição (RN08) ficaria olhando
 * para o produto errado.
 *
 * Uma consulta só ao banco: a despensa de um estudante cabe folgado em memória,
 * e uma busca por item multiplicaria a ida ao banco pelo tamanho da nota.
 */
async function casarComADespensa(
  usuarioId: number,
  itens: ItemConsultado[],
): Promise<ItemSugerido[]> {
  const produtos = await produtoRepository.listarPorUsuario(usuarioId);
  const conhecidos = produtos.map((produto) => ({ id: produto.id, nome: produto.nome }));

  return itens.map((item) => ({
    ...item,
    sugestao: sugerirProduto(item.descricao, conhecidos),
  }));
}
