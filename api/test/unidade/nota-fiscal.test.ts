/**
 * RN22 — leitura dos itens na consulta pública da SEFAZ.
 *
 * Aqui não há rede: o que se testa é o parser do HTML e a montagem da URL, que
 * são as duas partes que quebram sozinhas.
 *
 * O HTML de apoio é decalcado de uma consulta real ao portal paulista, com as
 * asperezas que ela tem: o emitente num `<div>` e não num `<span>`, `<strong>`
 * no meio do rótulo da quantidade, unidade em minúscula. Fixture higienizada
 * passaria em teste e falharia em produção — foi exatamente o que aconteceu
 * com o emitente antes desta versão.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  extrairDataDeEmissao,
  extrairEmitente,
  extrairItens,
  extrairValorTotal,
  urlDeConsulta,
} from '../../src/services/notaFiscal/sefazSp.js';
import { provedorPara, ufDaChave } from '../../src/services/notaFiscalService.js';

const PAGINA = `
<html><body>
  <div class="txtCenter">
    <div id="u20" class="txtTopo">Centro De Distribuicao Butanta Ltda</div>
    <div class="text"> CNPJ: 05.002.327/0001-16</div>
  </div>
  <table id="tabResult" class="filterable">
    <tr id="Item + 1">
      <td valign="top"><span class="txtTit">ARROZ TIPO 1 5KG</span>
        <span class="RCod"> (C&oacute;digo: 147887 ) </span> <br>
        <span class="Rqtd"> <strong>Qtde.:</strong>2</span>
        <span class="RUN"> <strong>UN: </strong>un</span>
        <span class="RvlUnit"> <strong>Vl. Unit.:</strong>&nbsp;&nbsp;25,90</span></td>
      <td><span class="valor">51,80</span></td>
    </tr>
    <tr id="Item + 2">
      <td valign="top"><span class="txtTit">CAQUI FUYU FRUTA KG</span>
        <span class="Rqtd"> <strong>Qtde.:</strong>1,235</span>
        <span class="RUN"> <strong>UN: </strong>kg</span>
        <span class="RvlUnit"> <strong>Vl. Unit.:</strong>&nbsp;&nbsp;7,49</span></td>
      <td><span class="valor">9,25</span></td>
    </tr>
  </table>
  <div id="totalNota">
    <span class="totalNumb txtTitR">Valor total R$</span><span class="totalNumb">1.061,05</span>
    <span class="totalNumb txtMax">Valor a pagar R$:</span><span class="totalNumb">1.055,00</span>
  </div>
  <div id="infos">Emiss&atilde;o: 15/07/2026 19:04:32 - Via Consumidor</div>
</body></html>`;

describe('RN22 — itens da consulta pública', () => {
  test('extrai descrição, quantidade, unidade e valor unitário de cada item', () => {
    const itens = extrairItens(PAGINA);

    assert.equal(itens.length, 2);
    assert.deepEqual(itens[0], {
      descricao: 'ARROZ TIPO 1 5KG',
      quantidade: 2,
      unidade: 'un',
      valorUnitario: 25.9,
    });
  });

  test('lê quantidade fracionada, que é o caso de item pesado na balança', () => {
    const itens = extrairItens(PAGINA);
    assert.equal(itens[1]?.quantidade, 1.235);
    // Minúscula porque é assim que o portal publica — o valor vai para a tela,
    // então normalizar aqui seria inventar dado que a nota não tem.
    assert.equal(itens[1]?.unidade, 'kg');
  });

  test('milhar com ponto não vira número errado', () => {
    assert.equal(extrairValorTotal(PAGINA), 1055);
  });

  test('a data de emissão vira ISO', () => {
    assert.equal(extrairDataDeEmissao(PAGINA), '2026-07-15');
  });

  test('o emitente vira o local da compra', () => {
    assert.equal(extrairEmitente(PAGINA), 'Centro De Distribuicao Butanta Ltda');
  });

  test('página de erro não produz item nenhum', () => {
    // Layout mudado ou chave recusada devolve lista vazia, não item quebrado:
    // é isso que faz o app cair no preenchimento manual em vez de gravar lixo.
    assert.deepEqual(extrairItens('<html><body><p>Nota não encontrada</p></body></html>'), []);
  });

  test('item sem preço é descartado em vez de entrar com zero', () => {
    const parcial = '<span class="txtTit">FEIJAO</span><span class="Rqtd">Qtde.:1</span>';
    assert.deepEqual(extrairItens(parcial), []);
  });
});

describe('RN22 — a URL consultada', () => {
  const qr =
    'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260705002327000116650080001346451674288593|2|1|1|ABC123DEF';

  test('aproveita a query do QR Code, que carrega o hash de validação', () => {
    const url = urlDeConsulta(qr);
    assert.ok(url?.includes('p=35260705002327000116650080001346451674288593|2|1|1|ABC123DEF'));
  });

  test('o domínio é sempre o da SEFAZ, nunca o que vier no código lido', () => {
    // Um QR Code forjado apontaria a consulta do servidor para onde quisesse.
    const forjado = 'https://site-invasor.example/roubo?p=' + '3'.repeat(44) + '|2|1|1|X';
    const url = urlDeConsulta(forjado);
    assert.ok(url?.startsWith('https://www.nfce.fazenda.sp.gov.br/'));
    assert.ok(!url?.includes('site-invasor'));
  });

  test('conteúdo sem chave nem hash não vira consulta', () => {
    assert.equal(urlDeConsulta('https://exemplo.com/pagina'), null);
    assert.equal(urlDeConsulta('texto qualquer'), null);
  });
});

describe('RN22 — escolha do provedor pela UF', () => {
  test('a UF são os dois primeiros dígitos da chave', () => {
    assert.equal(ufDaChave('35260705002327000116650080001346451674288593'), 35);
  });

  test('São Paulo tem provedor', () => {
    assert.equal(provedorPara('35260705002327000116650080001346451674288593')?.uf, 35);
  });

  test('UF sem implementação devolve nada, e o app pede os itens', () => {
    // 33 = Rio de Janeiro, ainda sem parser próprio.
    assert.equal(provedorPara('33260705002327000116650080001346451674288593'), null);
  });
});
