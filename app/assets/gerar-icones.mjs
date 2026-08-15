/**
 * Gera os ícones do Xepa a partir de SVG.
 *
 * A marca é a **sacola** — palavra do próprio produto para o resumo do mês —
 * com um X vazado no corpo, do nome. A primeira tentativa foi só o X num
 * quadrado arredondado e foi descartada: isso é o ícone universal de fechar,
 * e como ícone de app lia "cancelar". A silhueta da sacola resolve, porque o
 * X passa a ser detalhe dentro de uma forma que já significa outra coisa.
 *
 * Cores do tema: lilás #9B7EDE (primária) e azul #6C8BE0 (secundária).
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const LILAS = '#9B7EDE';
const LILAS_FORTE = '#7B5BC7';
const AZUL = '#6C8BE0';

/**
 * A sacola: corpo levemente trapezoidal (mais largo embaixo, como sacola
 * cheia) e alça em arco. O X é vazado, então ele assume a cor do fundo.
 *
 * `escala` encolhe sem mexer na tela — resolve a zona segura do ícone
 * adaptativo do Android, que corta num círculo central.
 */
function sacola({ cor, escala = 1 }) {
  const c = 512;
  const e = (v) => c + (v - c) * escala;

  // Corpo
  const topo = e(400);
  const base = e(816);
  const meiaLargTopo = 176 * escala;
  const meiaLargBase = 212 * escala;
  const r = 46 * escala;

  const corpo = [
    `M ${c - meiaLargTopo + r} ${topo}`,
    `L ${c + meiaLargTopo - r} ${topo}`,
    `Q ${c + meiaLargTopo} ${topo} ${c + meiaLargTopo + (meiaLargBase - meiaLargTopo) * 0.5} ${topo + (base - topo) * 0.5}`,
    `L ${c + meiaLargBase} ${base - r}`,
    `Q ${c + meiaLargBase} ${base} ${c + meiaLargBase - r} ${base}`,
    `L ${c - meiaLargBase + r} ${base}`,
    `Q ${c - meiaLargBase} ${base} ${c - meiaLargBase} ${base - r}`,
    `L ${c - meiaLargTopo - (meiaLargBase - meiaLargTopo) * 0.5} ${topo + (base - topo) * 0.5}`,
    `Q ${c - meiaLargTopo} ${topo} ${c - meiaLargTopo + r} ${topo}`,
    'Z',
  ].join(' ');

  // Alça: arco que nasce da boca da sacola.
  const alcaR = 104 * escala;
  const alcaY = topo + 4 * escala;
  const alcaTraco = 46 * escala;
  const alca =
    `M ${c - alcaR} ${alcaY} ` +
    `A ${alcaR} ${alcaR * 1.08} 0 0 1 ${c + alcaR} ${alcaY}`;

  // X vazado, centrado no corpo.
  const xc = topo + (base - topo) * 0.56;
  const braco = 78 * escala;
  const xTraco = 60 * escala;
  const linhaX = (dx, dy) =>
    `<line x1="${c - braco * dx}" y1="${xc - braco * dy}" x2="${c + braco * dx}" y2="${xc + braco * dy}" ` +
    `stroke="#000" stroke-width="${xTraco}" stroke-linecap="round" />`;

  // A alça puxa massa para cima, então o centro geométrico da marca não é o
  // centro da tela. Sem corrigir, o ícone fica visivelmente caído.
  const topoDaMarca = alcaY - alcaR * 1.08 - alcaTraco / 2;
  const baseDaMarca = base;
  const deslocamento = 512 - (topoDaMarca + baseDaMarca) / 2;

  return `
    <mask id="vazado">
      <rect width="1024" height="1024" fill="#000"/>
      <path d="${corpo}" fill="#fff"/>
      ${linhaX(1, 1)}
      ${linhaX(1, -1)}
    </mask>
    <g transform="translate(0 ${deslocamento.toFixed(1)})">
      <path d="${corpo}" fill="${cor}" mask="url(#vazado)"/>
      <path d="${alca}" fill="none" stroke="${cor}" stroke-width="${alcaTraco}" stroke-linecap="round"/>
    </g>`;
}

/** Ícone cheio: fundo em degradê da primária para a secundária, marca branca. */
function svgIcone({ escala = 1, raio = 0 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="fundo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${LILAS}"/>
      <stop offset="1" stop-color="${AZUL}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="${raio}" fill="url(#fundo)"/>
  ${sacola({ cor: '#FFFFFF', escala })}
</svg>`;
}

/** Marca sozinha, para a splash, que tem fundo quase branco. */
function svgMarca() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="tinta" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${LILAS_FORTE}"/>
      <stop offset="1" stop-color="${AZUL}"/>
    </linearGradient>
  </defs>
  ${sacola({ cor: 'url(#tinta)', escala: 1.2 })}
</svg>`;
}

const destino = process.argv[2];
if (!destino) throw new Error('informe a pasta de destino');
await mkdir(destino, { recursive: true });

const saidas = [
  // iOS aplica a própria máscara, então o ícone vai quadrado e sangrado.
  { nome: 'icon.png', svg: svgIcone({ escala: 1.3 }), tamanho: 1024 },
  // Android corta num círculo de ~66%: a marca encolhe para caber na zona segura.
  { nome: 'adaptive-icon.png', svg: svgIcone({ escala: 0.95 }), tamanho: 1024 },
  { nome: 'splash-icon.png', svg: svgMarca(), tamanho: 1024 },
  { nome: 'favicon.png', svg: svgIcone({ escala: 1.3, raio: 180 }), tamanho: 48 },
];

for (const { nome, svg, tamanho } of saidas) {
  const png = await sharp(Buffer.from(svg))
    .resize(tamanho, tamanho)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(destino, nome), png);
  const { width, height } = await sharp(png).metadata();
  console.log(`${nome.padEnd(20)} ${width}x${height} ${(png.length / 1024).toFixed(1)} KB`);
}

await writeFile(join(destino, 'marca.svg'), svgMarca());
console.log('marca.svg           (fonte vetorial)');

// Prova de legibilidade: o ícone é visto a 40–60px na tela inicial, não a 1024.
const teste = process.argv[3];
if (teste) {
  const tira = [];
  for (const t of [40, 60, 87, 120]) {
    tira.push(
      await sharp(Buffer.from(svgIcone()))
        .resize(t, t)
        .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#FBFAFF' })
        .png()
        .toBuffer(),
    );
  }
  const alturas = [40, 60, 87, 120].map((t) => t + 16);
  const largura = alturas.reduce((s, a) => s + a, 0);
  const altura = Math.max(...alturas);
  await sharp({
    create: { width: largura, height: altura, channels: 4, background: '#FBFAFF' },
  })
    .composite(
      tira.map((input, i) => ({
        input,
        left: alturas.slice(0, i).reduce((s, a) => s + a, 0),
        top: 0,
      })),
    )
    .png()
    .toFile(teste);
  console.log(`\nprova de tamanhos -> ${teste}`);
}
