/**
 * Extração da chave de acesso a partir do QR Code da NFC-e (RF008, RN22).
 *
 * O QR **não** carrega os produtos: ele carrega uma URL do portal da SEFAZ com
 * a chave de acesso e parâmetros de validação. O que dá para tirar dele é a
 * identidade da nota — 44 dígitos —, e é ela que a API usa para recusar nota
 * repetida (RN06).
 *
 * Há dois formatos em circulação, e o leitor precisa aceitar os dois:
 *
 * - **versão 2.0** (atual): `...?p=<chave>|<versão>|<ambiente>|<idToken>|<hash>`
 *   — a chave é o primeiro campo, separado por `|`.
 * - **versão 1.0** (notas antigas): `...?chNFe=<chave>&nVersao=100&tpAmb=1&...`
 *   — a chave vem no parâmetro `chNFe`.
 *
 * Cada estado publica a nota num domínio próprio, então o host não serve para
 * decidir nada — o que vale é onde a chave está dentro da URL.
 */

/** A chave de acesso da NFC-e tem exatamente 44 dígitos. */
const TAMANHO_DA_CHAVE = 44;

export interface LeituraDeChave {
  chave: string;
  /** De onde a chave saiu — útil para explicar uma leitura que não deu certo. */
  formato: 'qr-v2' | 'qr-v1' | 'digitada';
}

/**
 * Devolve a chave de acesso contida no conteúdo lido, ou `null` se não houver.
 *
 * Aceita também os 44 dígitos crus, que é o caminho de quem digita a chave à
 * mão quando a câmera não ajuda (nota amassada, pouca luz, aparelho sem foco).
 */
export function extrairChaveDeAcesso(conteudo: string): LeituraDeChave | null {
  const texto = conteudo.trim();
  if (texto === '') return null;

  // Digitada: só dígitos, possivelmente separados por espaço ou ponto.
  const somenteDigitos = texto.replace(/[\s.-]/g, '');
  if (ehChave(somenteDigitos)) {
    return { chave: somenteDigitos, formato: 'digitada' };
  }

  const parametros = parametrosDaUrl(texto);

  // Versão 2.0 — `p=<chave>|<versão>|<ambiente>|<idToken>|<hash>`
  const p = parametros.get('p');
  if (p) {
    const chave = p.split('|')[0]?.trim() ?? '';
    if (ehChave(chave)) return { chave, formato: 'qr-v2' };
  }

  // Versão 1.0 — `chNFe=<chave>`
  const chNFe = parametros.get('chnfe')?.trim() ?? '';
  if (ehChave(chNFe)) return { chave: chNFe, formato: 'qr-v1' };

  return null;
}

function ehChave(valor: string): boolean {
  return new RegExp(`^\\d{${TAMANHO_DA_CHAVE}}$`).test(valor);
}

/**
 * Parâmetros da query, em minúsculas na chave.
 *
 * Não usa `new URL()` de propósito: alguns portais estaduais publicam a URL com
 * caracteres que o parser recusa, e aí uma nota válida deixaria de ser lida por
 * um detalhe da URL que não tem nada a ver com a chave.
 */
function parametrosDaUrl(texto: string): Map<string, string> {
  const parametros = new Map<string, string>();
  const inicio = texto.indexOf('?');
  if (inicio === -1) return parametros;

  for (const par of texto.slice(inicio + 1).split('&')) {
    const separador = par.indexOf('=');
    if (separador === -1) continue;
    const nome = par.slice(0, separador).trim().toLowerCase();
    const valor = par.slice(separador + 1);
    if (nome !== '') parametros.set(nome, decodificar(valor));
  }
  return parametros;
}

function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    // Percentagem malformada na URL não pode derrubar a leitura.
    return valor;
  }
}
