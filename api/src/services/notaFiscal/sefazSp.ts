/**
 * Consulta pública da NFC-e paulista (RF008, RN22) — UF 35.
 *
 * A leitura é do HTML da página de consulta por QR Code, não de um webservice:
 * o webservice da SEFAZ exige certificado ICP-Brasil e credenciamento, que o
 * Xepa não tem (mesma limitação de RNF18 no Open Finance). A página pública,
 * por outro lado, é aberta — e a rota do QR Code dispensa captcha porque o
 * hash na URL já prova posse da nota.
 *
 * Depender de HTML alheio tem um custo, e ele está assumido de propósito: se a
 * SEFAZ mudar o layout, o parser devolve `null` e o app volta a pedir os itens
 * ao usuário. Nada quebra, nada some, só deixa de adiantar a digitação. Por
 * isso todo `extrair*` daqui falha para `null` em vez de lançar.
 *
 * O HTML vem em classes estáveis há anos, uma por campo do item:
 *
 *     <span class="txtTit">ARROZ TIPO 1 5KG</span>
 *     <span class="Rqtd">Qtde.:1</span>
 *     <span class="RUN">UN: UN</span>
 *     <span class="RvlUnit">Vl. Unit.:  25,90</span>
 */

import type { ItemConsultado, NotaConsultada, ProvedorNotaFiscal } from './provedor.js';

/** Quanto se espera pela SEFAZ antes de desistir e deixar o usuário digitar. */
const TEMPO_LIMITE_MS = 12_000;

const BASE = 'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx';

export class ProvedorSefazSp implements ProvedorNotaFiscal {
  readonly nome = 'SEFAZ-SP';
  readonly uf = 35;

  async consultar(conteudoQr: string, chaveAcesso: string): Promise<NotaConsultada | null> {
    const url = urlDeConsulta(conteudoQr);
    if (!url) return null;

    const html = await baixar(url);
    if (!html) return null;

    const itens = extrairItens(html);
    // Página sem item é página de erro: chave inexistente, hash recusado ou
    // sessão que o portal não aceitou. Não vale insistir.
    if (itens.length === 0) return null;

    return {
      chaveAcesso,
      localCompra: extrairEmitente(html),
      dataCompra: extrairDataDeEmissao(html),
      valorTotal: extrairValorTotal(html),
      itens,
    };
  }
}

/**
 * A URL que se manda para o portal.
 *
 * O conteúdo do QR já é uma URL da própria SEFAZ, mas ela não é reaproveitada
 * inteira: o domínio vem do código lido e seguir isso às cegas seria buscar
 * qualquer endereço que couber num QR Code — um QR forjado apontaria a consulta
 * do servidor para onde quisesse. O que se aproveita é só a query, remontada
 * sobre o endereço fixo do portal paulista.
 */
export function urlDeConsulta(conteudoQr: string): string | null {
  const inicio = conteudoQr.indexOf('?');
  if (inicio === -1) return null;

  const query = conteudoQr.slice(inicio + 1).trim();
  if (query === '') return null;

  // `p=` (v2) ou `chNFe=` (v1) — sem um dos dois não há o que consultar.
  if (!/(^|&)(p|chNFe)=/i.test(query)) return null;

  return `${BASE}?${query}`;
}

async function baixar(url: string): Promise<string | null> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(url, {
      signal: controle.signal,
      headers: {
        // Sem User-Agent de navegador o portal responde uma página de bloqueio.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    if (!resposta.ok) return null;
    return await resposta.text();
  } catch {
    // Timeout, DNS, TLS, portal fora do ar: tudo isso é "não deu", e quem
    // decide o que fazer com isso é o Service.
    return null;
  } finally {
    clearTimeout(relogio);
  }
}

// ---------- extração ----------

/**
 * Conteúdo de cada elemento com a classe pedida, em ordem de aparição.
 *
 * A tag entra como parâmetro porque a página não é consistente: os campos do
 * item são `<span>`, mas o nome do emitente é um `<div class="txtTopo">`.
 */
function porClasse(html: string, classe: string, tag = 'span'): string[] {
  const padrao = new RegExp(
    `<${tag}[^>]*class=["'][^"']*\\b${classe}\\b[^"']*["'][^>]*>([\\s\\S]*?)</${tag}>`,
    'gi',
  );
  return [...html.matchAll(padrao)].map((achado) => texto(achado[1] ?? ''));
}

/** Tira marcação e entidades, e normaliza o espaço em branco. */
function texto(bruto: string): string {
  return bruto
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    // Entidade de letra acentuada (`&atilde;`, `&ccedil;`) cai na letra sem
    // acento: a página nem sempre vem em UTF-8 cru, e "Emissão" escrito como
    // entidade não pode deixar de casar com a busca pela data.
    .replace(/&([aeiouncAEIOUNC])(?:acute|grave|circ|tilde|uml|cedil|ring|slash);/g, '$1')
    .replace(/&#(\d+);/g, (_, codigo: string) => String.fromCodePoint(Number(codigo)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codigo: string) => String.fromCodePoint(parseInt(codigo, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Número no formato brasileiro (`1.234,56`) que aparecer no texto.
 *
 * Os rótulos vêm colados no valor ("Vl. Unit.: 25,90"), então a busca é pelo
 * número, não pela posição.
 */
function numero(bruto: string): number | null {
  const achado = bruto.match(/-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/);
  if (!achado) return null;
  const valor = Number(achado[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(valor) ? valor : null;
}

export function extrairItens(html: string): ItemConsultado[] {
  const descricoes = porClasse(html, 'txtTit');
  const quantidades = porClasse(html, 'Rqtd');
  const unidades = porClasse(html, 'RUN');
  const unitarios = porClasse(html, 'RvlUnit');

  const itens: ItemConsultado[] = [];

  for (const [indice, descricao] of descricoes.entries()) {
    const quantidade = numero(quantidades[indice] ?? '');
    const valorUnitario = numero(unitarios[indice] ?? '');

    // Um item sem descrição, sem quantidade ou sem preço não é um item: é um
    // pedaço de página que casou com a classe por acaso. Entra no manual.
    if (descricao === '' || quantidade === null || valorUnitario === null) continue;
    if (quantidade <= 0 || valorUnitario < 0) continue;

    itens.push({
      descricao,
      quantidade,
      unidade: (unidades[indice] ?? '').replace(/^UN:?\s*/i, '').trim() || null,
      valorUnitario,
    });
  }

  return itens;
}

export function extrairEmitente(html: string): string | null {
  // `<div id="u20" class="txtTopo">` na página paulista; `<span>` em outras
  // versões do mesmo XSL. Procura nos dois, e fica com o primeiro que tiver
  // texto — é sempre a razão social, no topo do documento.
  const achados = [...porClasse(html, 'txtTopo', 'div'), ...porClasse(html, 'txtTopo')];
  return achados.find((nome) => nome !== '') ?? null;
}

/** `Emissão: 15/07/2026 10:32:11` → `2026-07-15`. */
export function extrairDataDeEmissao(html: string): string | null {
  const achado = texto(html).match(/Emiss[ãa]o:?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!achado) return null;
  const [, dia, mes, ano] = achado;
  return `${ano}-${mes}-${dia}`;
}

export function extrairValorTotal(html: string): number | null {
  // "Valor a pagar R$:" é o que o consumidor pagou; o "Valor total R$" vem
  // antes de desconto. Preferimos o primeiro, com o segundo como recuo.
  const limpo = texto(html);
  const aPagar = limpo.match(/Valor a pagar\s*R\$:?\s*([\d.,]+)/i);
  if (aPagar?.[1]) return numero(aPagar[1]);

  const total = limpo.match(/Valor total\s*R\$:?\s*([\d.,]+)/i);
  if (total?.[1]) return numero(total[1]);

  return null;
}
