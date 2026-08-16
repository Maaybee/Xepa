/**
 * O desenho de um item da despensa: ícone e cor por categoria.
 *
 * O template de mercado põe foto de produto no topo do cartão, e o Xepa não
 * tem foto — nem tem de onde tirar. A nota fiscal identifica o produto pelo
 * **código interno do mercado** (`Código: 39062`), não pelo código de barras:
 * numa nota real de 50 itens, nenhum GTIN. Sem identificador global não há
 * base para consultar, e metade de uma compra de verdade (batata, alface,
 * carne, fruta a granel) não tem código de barras nenhum para escanear.
 *
 * Então o lugar da foto recebe um ícone de categoria. Ele funciona para 100%
 * dos itens, inclusive os da feira, não depende de rede nem de licença de
 * imagem, e não inventa dado que o sistema não tem.
 *
 * **A categoria é inferida do nome**, e não do campo `categoria`, porque
 * produto criado a partir de nota nasce com `categoria: null`
 * (`despensaService`, ao conciliar os itens). Ancorar o desenho no campo
 * deixaria quase toda a despensa com o ícone genérico. Quando o campo está
 * preenchido, ele manda — o que o usuário digitou vale mais que o palpite.
 *
 * O ícone é a identidade; a cor só reforça. É de propósito: dez categorias não
 * cabem em dez cores que se distingam sob daltonismo, e quem não separa os
 * tons continua lendo o item pelo desenho.
 */

import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type NomeDeIcone = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface DesenhoDoItem {
  icone: NomeDeIcone;
  cor: string;
  /** Para leitor de tela e para a linha de apoio quando não há categoria. */
  rotulo: string;
}

interface Categoria extends DesenhoDoItem {
  /**
   * Começos de palavra que denunciam a categoria.
   *
   * São prefixos, não palavras inteiras, pelo mesmo motivo do casamento com a
   * despensa: o PDV trunca, e o nome que sobra no produto pode ser `BISC`,
   * `DET LIQ` ou `MARG`. `carn` pega carne e carnes; `iogurt`, iogurte.
   */
  pistas: string[];
}

/**
 * Ordem importa: a primeira categoria que casar vence.
 *
 * Por isso limpeza e higiene vêm antes de mercearia — `papel higiênico` casaria
 * com a pista genérica `papel`, e `água sanitária` com `agua`.
 */
const CATEGORIAS: Categoria[] = [
  {
    rotulo: 'Limpeza',
    icone: 'spray-bottle',
    cor: '#5BA9C7',
    pistas: [
      'deterg', 'det liq', 'sabao', 'amaciant', 'desinfet', 'alvejant', 'candida',
      'agua sanit', 'limpad', 'multiuso', 'esponja', 'saco lixo', 'lustra', 'cloro',
      'veja', 'ype', 'limpol', 'omo', 'brilhante',
      // Utilidade de cozinha mora aqui: não se come, e a alternativa era o
      // ícone genérico.
      'papel alum', 'filme pvc', 'papel filme', 'papel manteiga', 'fosforo', 'vela',
    ],
  },
  {
    rotulo: 'Higiene',
    icone: 'paper-roll-outline',
    cor: '#7FB5A4',
    pistas: [
      'papel hig', 'pap hig', 'papel toalha', 'higien', 'shampoo', 'xampu', 'condicion', 'sabonet',
      'creme dental', 'dental', 'escova', 'desodor', 'absorv', 'fralda', 'algodao',
      'cotonet', 'lenco',
    ],
  },
  {
    rotulo: 'Hortifrúti',
    icone: 'carrot',
    cor: '#6FAE6B',
    pistas: [
      'alface', 'tomate', 'cebola', 'alho', 'batata', 'cenoura', 'abobrinha', 'abobora',
      'pepino', 'pimentao', 'brocolis', 'couve', 'repolho', 'espinafre', 'rucula',
      'agriao', 'beterraba', 'mandioc', 'chuchu', 'quiabo', 'berinjela', 'salsa',
      'cheiro verde', 'coentro', 'milho verde', 'vagem', 'ervilha fres',
      'banana', 'maca', 'laranja', 'limao', 'mamao', 'manga', 'melancia', 'melao',
      'abacaxi', 'uva', 'pera', 'pessego', 'ameixa', 'goiaba', 'caqui', 'kiwi',
      'morango', 'abacate', 'tangerin', 'mexeric', 'acerola', 'coco',
    ],
  },
  {
    rotulo: 'Carnes',
    icone: 'food-drumstick-outline',
    cor: '#C77B7B',
    pistas: [
      'carne', 'bife', 'file', 'frango', 'coxa', 'sobrecoxa', 'peito', 'asa',
      'musculo', 'acem', 'patinho', 'alcatra', 'picanha', 'costela', 'linguic',
      'salsich', 'bacon', 'presunt', 'mortadel', 'salame', 'nuggets', 'hamburg',
      'almondeg', 'strogonoff', 'pernil', 'lombo', 'suin', 'bovin', 'peixe',
      'salmao', 'tilapia', 'sardinh', 'atum', 'camarao', 'pate',
    ],
  },
  {
    rotulo: 'Laticínios',
    icone: 'cheese',
    cor: '#E0B15C',
    pistas: [
      'leite', 'queijo', 'mussarela', 'muzarela', 'prato', 'requeij', 'iogurt',
      'manteig', 'margarin', 'marg', 'creme de leite', 'nata', 'ricota', 'coalhada',
      'danone', 'yakult', 'ovo', 'ovos',
    ],
  },
  {
    rotulo: 'Padaria',
    icone: 'bread-slice-outline',
    cor: '#D89A62',
    pistas: [
      'pao', 'paes', 'bisnag', 'torrada', 'baguet', 'croiss', 'bolo', 'rosquin',
      'broa', 'sonho', 'panetone',
    ],
  },
  {
    rotulo: 'Mercearia',
    icone: 'noodles',
    cor: '#B98FE8',
    pistas: [
      'arroz', 'feijao', 'macarr', 'mac', 'massa', 'espaguet', 'penne',
      'farinha', 'fuba', 'aveia', 'granola', 'lentilh', 'grao de bico', 'soja',
      'oleo', 'azeite', 'vinagre', 'molho', 'extrato', 'atum lat', 'milho lat',
      'ervilha lat', 'sardinha lat', 'acucar', 'adocant', 'sal', 'tempero',
      'colorif', 'oregano', 'canela', 'fermento', 'gelat', 'pudim', 'amido',
      'leite cond', 'leite po', 'achocolat', 'nescau', 'toddy', 'cafe', 'cha',
      'mate', 'pipoca', 'enlatad', 'conserva', 'azeit', 'azeiton', 'palmito', 'ketchup',
      'maion', 'mostard', 'shoyu', 'caldo', 'sopa',
    ],
  },
  {
    rotulo: 'Bebidas',
    icone: 'bottle-soda-outline',
    cor: '#6C8BE0',
    pistas: [
      'refrig', 'coca', 'guarana', 'fanta', 'sprite', 'pepsi', 'suco', 'agua',
      'cervej', 'vinho', 'energet', 'isoton', 'gatorade', 'tonic', 'chopp',
      'whisky', 'vodka', 'cachac', 'licor',
    ],
  },
  {
    rotulo: 'Doces',
    icone: 'cookie-outline',
    cor: '#DE8FB4',
    pistas: [
      'bisc', 'bolach', 'chocolat', 'choco', 'wafer', 'bala', 'chiclet', 'pirulit',
      'doce', 'brigadeir', 'sorvet', 'picole', 'geleia', 'sobremesa', 'bombom',
      'salgadinh', 'chips', 'amendoim', 'castanh',
    ],
  },
  {
    rotulo: 'Congelados',
    icone: 'snowflake',
    cor: '#7FC4DE',
    pistas: ['congel', 'lasanh', 'pizza', 'nugget cong', 'polpa', 'batata frita cong'],
  },
];

/** Quando nada casa: o item existe, só não se sabe o que é. */
const PADRAO: DesenhoDoItem = {
  icone: 'package-variant-closed',
  cor: '#9B7EDE',
  rotulo: 'Item',
};

/** Minúsculas e sem acento, para as pistas não precisarem de variante acentuada. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A pista precisa abrir uma palavra, não aparecer no meio dela.
 *
 * Sem isso `sal` casaria dentro de "pessoal" e `cha` dentro de "salsicha", e o
 * cartão mostraria o ícone errado com toda a confiança do mundo.
 */
function contemPista(texto: string, bruta: string): boolean {
  // O `trim` não é decoro: uma pista escrita com espaço no fim (`'mac '`)
  // viraria `'mac  '` na comparação de prefixo e nunca casaria com nada.
  const pista = bruta.trim();
  return texto === pista || texto.startsWith(`${pista} `) || texto.includes(` ${pista}`);
}

/**
 * O desenho do item, a partir do que o usuário escreveu na categoria ou, na
 * falta dela, do nome do produto.
 */
export function desenhoDoItem(nome: string, categoria?: string | null): DesenhoDoItem {
  // A categoria digitada manda: é declaração, não palpite.
  const declarada = categoria ? acharCategoria(normalizar(categoria)) : null;
  if (declarada) return semPistas(declarada);

  const achada = acharCategoria(normalizar(nome));
  return achada ? semPistas(achada) : PADRAO;
}

function acharCategoria(texto: string): Categoria | null {
  if (texto === '') return null;
  return (
    CATEGORIAS.find(
      (categoria) =>
        // O nome da própria categoria é pista: quem digita "bebidas" no campo
        // está dizendo a categoria, e seria absurdo não reconhecer a palavra
        // que o app usa para nomeá-la.
        contemPista(texto, normalizar(categoria.rotulo)) ||
        categoria.pistas.some((pista) => contemPista(texto, pista)),
    ) ?? null
  );
}

function semPistas({ icone, cor, rotulo }: Categoria): DesenhoDoItem {
  return { icone, cor, rotulo };
}
