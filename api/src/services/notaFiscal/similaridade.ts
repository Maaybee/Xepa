/**
 * Casamento entre a descrição que vem na nota e o produto que já está na
 * despensa (RF008, RN22).
 *
 * O problema real: o PDV do mercado trunca a descrição em pouco mais de vinte
 * caracteres e enche o resto de marca e embalagem. O que chega é
 * `MAION HELLMANNS 500G TRA`, `PAPEL HIG DELUXE L12P11`, `MAC INST NISSIN 85G`
 * — e na despensa o mesmo item se chama `maionese`, `papel higiênico`,
 * `macarrão instantâneo`. Como a conciliação do estoque é por nome exato
 * (`produtoRepository.buscarPorNome`), aceitar a descrição crua criaria um
 * produto novo a cada compra, e o alerta de reposição (RN08) nunca voltaria a
 * enxergar o item que já existia.
 *
 * Por que **não** é distância de edição: `MAION HELLMANNS 500G TRA` e
 * `maionese` estão a mais de vinte edições de distância, e um limiar frouxo o
 * bastante para aceitá-los aceitaria qualquer coisa. A pista útil não está na
 * string inteira, está no token — e a deformação típica é **truncamento**, que
 * preserva o começo da palavra. Daí o casamento ser por prefixo, token a
 * token: `hig` é começo de `higienico`, `inst` de `instantaneo`.
 *
 * Nada disso decide sozinho. A sugestão é um palpite mostrado ao usuário, que
 * confirma antes de qualquer coisa entrar no estoque; empate entre dois
 * produtos vira nenhuma sugestão, porque errar calado é pior do que não
 * sugerir.
 */

/** Abaixo disto não se sugere nada — o palpite atrapalharia mais que ajudar. */
const CONFIANCA_MINIMA = 0.7;

/**
 * Tamanho mínimo do pedaço truncado na nota para ele valer como pista.
 *
 * `mac`, `hig` e `inst` são as truncagens que importam, e a menor tem três
 * letras. Com duas, `sa` casaria com sal, sacola, salsicha e sabão ao mesmo
 * tempo.
 */
const PREFIXO_MINIMO = 3;

/**
 * Token que é só embalagem ou medida: `500g`, `1kg`, `2l`, `12un`, `85`.
 *
 * Não descrevem o produto, aparecem em quase toda nota e, se ficassem,
 * emparelhariam itens que só têm o tamanho em comum.
 */
const MEDIDA = /^\d+([.,]\d+)?(g|kg|mg|ml|l|un|cx|pct|pc|kit|lt|gr)?$/;

/**
 * Até que posição da descrição a cabeça do nome do produto pode aparecer.
 *
 * Zero seria rígido demais — há descrição que abre com categoria antes do
 * produto. Depois da segunda palavra já não é cabeça, é qualificador.
 */
const POSICAO_MAXIMA_DA_CABECA = 1;

export interface ProdutoConhecido {
  id: number;
  nome: string;
}

export interface Sugestao {
  produtoId: number;
  /** O nome como está na despensa — é ele que vai para o campo. */
  nome: string;
  /** 0 a 1. Serve para explicar a sugestão, não para escondê-la. */
  confianca: number;
}

/** Minúsculas, sem acento e sem pontuação. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    // Marcas de acento que o NFD separou da letra. Escrito por código de ponto
    // porque a classe literal seria feita de caracteres invisíveis.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Palavras que descrevem o produto, sem medida nem sobra de uma letra. */
export function tokens(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((token) => token.length >= 2 && !MEDIDA.test(token));
}

function tamanhoDoPrefixoComum(a: string, b: string): number {
  const limite = Math.min(a.length, b.length);
  let i = 0;
  while (i < limite && a[i] === b[i]) i += 1;
  return i;
}

/** Distância de edição, mas só para dizer "difere por uma letra". */
function difereEmUmaLetra(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;

  // Caminha junto; ao primeiro desencontro, tenta pular a letra da palavra mais
  // longa (ou de ambas, se do mesmo tamanho) e exige o resto idêntico.
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (i === a.length && i === b.length) return false;

  const restoA = a.slice(a.length >= b.length ? i + 1 : i);
  const restoB = b.slice(b.length >= a.length ? i + 1 : i);
  return restoA === restoB;
}

/**
 * Quanto o token do produto e o token da nota se parecem, de 0 a 1.
 *
 * **A ordem dos argumentos importa**, e é onde mora a regra: quem trunca é o
 * PDV, então a palavra cortada está sempre do lado da nota. `hig` para
 * `higienico` é truncamento e vale muito; o contrário — um produto chamado
 * `cha` diante de `chantilly` na nota — não é truncamento nenhum, é uma
 * palavra curta que por acaso abre outra. Tratar os dois casos igual faria o
 * chá casar com chantilly e o sal com sacola.
 *
 * Por isso o prefixo do lado do produto exige palavra longa: `detergente` para
 * `detergentes` passa, `cha` para `chantilly` não.
 */
export function semelhancaDeToken(tokenDoProduto: string, tokenDaNota: string): number {
  if (tokenDoProduto === tokenDaNota) return 1;

  const prefixo = tamanhoDoPrefixoComum(tokenDoProduto, tokenDaNota);

  // Truncado na nota: o caso que este módulo existe para resolver.
  if (tokenDaNota.length >= PREFIXO_MINIMO && prefixo === tokenDaNota.length) return 0.9;

  // Uma letra de diferença: plural, erro de digitação, `mate` contra `matte`.
  if (Math.min(tokenDoProduto.length, tokenDaNota.length) >= 4) {
    if (difereEmUmaLetra(tokenDoProduto, tokenDaNota)) return 0.85;
  }

  // Produto que é começo do que veio na nota. Só para palavra longa o
  // bastante para o encontro não ser acaso.
  if (tokenDoProduto.length >= 5 && prefixo === tokenDoProduto.length) return 0.8;

  // Começam igual e depois divergem: `macarrao` e `macarronada` podem ser
  // produtos diferentes, então o palpite vale, mas vale pouco.
  if (prefixo >= 4) return 0.6;

  return 0;
}

/**
 * Onde, na descrição, está o token que melhor casa com o pedido.
 *
 * `Infinity` quando nenhum casa — o que reprova a descrição na regra da cabeça.
 */
function posicaoDoMelhorEncontro(tokenDoProduto: string, daNota: string[]): number {
  let melhor = 0;
  let posicao = Number.POSITIVE_INFINITY;

  for (const [indice, tokenDaNota] of daNota.entries()) {
    const nota = semelhancaDeToken(tokenDoProduto, tokenDaNota);
    if (nota > melhor) {
      melhor = nota;
      posicao = indice;
    }
  }

  return melhor > 0 ? posicao : Number.POSITIVE_INFINITY;
}

/**
 * Quanto a descrição da nota corresponde ao nome do produto.
 *
 * A média é sobre os tokens do **produto**, não os da nota: a nota traz marca e
 * embalagem que o produto não tem (`hellmanns`, `deluxe`), e cobrá-las baixaria
 * a nota de todo item de marca. O que precisa estar coberto é o nome que o
 * usuário escolheu.
 */
export function semelhanca(descricaoDaNota: string, nomeDoProduto: string): number {
  const daNota = tokens(descricaoDaNota);
  const doProduto = tokens(nomeDoProduto);
  if (daNota.length === 0 || doProduto.length === 0) return 0;

  // A cabeça do nome do produto precisa aparecer na cabeça da descrição.
  //
  // `MARG.QUALY 500G C/SAL` contém "sal", mas ali sal é qualificador da
  // margarina, não o produto — e sem esta regra a margarina entraria como
  // reposição de sal, mexendo no alerta (RN08) de um item que ninguém comprou.
  // O PDV escreve o substantivo principal primeiro, então casar longe do
  // começo é sinal de que se casou com o adjetivo.
  if (posicaoDoMelhorEncontro(doProduto[0] ?? '', daNota) > POSICAO_MAXIMA_DA_CABECA) return 0;

  let soma = 0;
  let algumForte = false;

  for (const tokenDoProduto of doProduto) {
    let melhor = 0;
    for (const tokenDaNota of daNota) {
      melhor = Math.max(melhor, semelhancaDeToken(tokenDoProduto, tokenDaNota));
    }
    if (melhor >= 0.9) algumForte = true;
    soma += melhor;
  }

  // Sem nenhum token forte, o que sobra é coincidência espalhada: dois nomes
  // que se parecem "um pouco" em tudo e nada em particular.
  if (!algumForte) return 0;

  return soma / doProduto.length;
}

/**
 * O produto da despensa que a descrição da nota provavelmente é.
 *
 * Devolve `null` quando ninguém passa do limiar e também quando dois produtos
 * empatam: ambiguidade é motivo para não sugerir, não para escolher o primeiro
 * da lista.
 */
export function sugerirProduto(
  descricaoDaNota: string,
  produtos: ProdutoConhecido[],
): Sugestao | null {
  let melhor: Sugestao | null = null;
  let empatado = false;

  for (const produto of produtos) {
    const confianca = semelhanca(descricaoDaNota, produto.nome);
    if (confianca < CONFIANCA_MINIMA) continue;

    if (!melhor || confianca > melhor.confianca) {
      melhor = { produtoId: produto.id, nome: produto.nome, confianca };
      empatado = false;
    } else if (confianca === melhor.confianca) {
      empatado = true;
    }
  }

  return empatado ? null : melhor;
}
