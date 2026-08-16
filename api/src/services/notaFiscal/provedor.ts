/**
 * A fronteira com a consulta pública de NFC-e (RF008, RN22).
 *
 * O QR Code da NFC-e **não** carrega os produtos: carrega uma URL do portal da
 * SEFAZ com a chave de acesso e um hash de validação. Os itens existem do outro
 * lado dessa URL, na consulta pública — que é gratuita, sem cadastro e, na rota
 * do QR Code, sem captcha, justamente porque o hash já prova que quem consulta
 * teve a nota em mãos.
 *
 * Daí a regra que organiza tudo aqui: **o que se guarda da leitura é a URL
 * inteira, não só os 44 dígitos.** Sem o `p=` completo o portal responde uma
 * página vazia, e a consulta por chave avulsa cai na rota com captcha.
 *
 * Cada estado publica em domínio próprio e com HTML próprio, então não existe
 * "um" provedor: existe um por UF, escolhido pelo código de UF que abre a
 * chave. Onde não houver implementação, a resposta é `null` e o app pede os
 * itens ao usuário — o caminho manual nunca sai de cena, porque portal fora do
 * ar, layout mudado ou UF sem suporte não podem impedir alguém de lançar uma
 * compra.
 */

export interface ItemConsultado {
  descricao: string;
  quantidade: number;
  /** `UN`, `KG`, `L`… como o portal publica. Só informativo. */
  unidade: string | null;
  valorUnitario: number;
}

export interface NotaConsultada {
  chaveAcesso: string;
  /** Nome do estabelecimento emissor, quando a página traz. */
  localCompra: string | null;
  /** ISO `YYYY-MM-DD`, da data de emissão. */
  dataCompra: string | null;
  /** Total declarado na nota — manda sobre a soma dos itens. */
  valorTotal: number | null;
  itens: ItemConsultado[];
}

export interface ProvedorNotaFiscal {
  /** Para diagnóstico e para a mensagem que o app mostra. */
  readonly nome: string;

  /** Código de UF (os dois primeiros dígitos da chave) que este provedor atende. */
  readonly uf: number;

  /**
   * Consulta a nota no portal e devolve os itens.
   *
   * Recebe o conteúdo **cru** do QR Code porque é ele que o portal aceita.
   * Devolve `null` quando a nota não pôde ser lida (fora do ar, hash recusado,
   * layout desconhecido) — sinal para o app cair no preenchimento manual. Só
   * lança se o chamador errou, nunca por falha do portal: portal indisponível é
   * um caso previsto, não uma exceção.
   */
  consultar(conteudoQr: string, chaveAcesso: string): Promise<NotaConsultada | null>;
}
