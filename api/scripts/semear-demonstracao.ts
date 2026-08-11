/**
 * Popula uma conta de demonstração, para abrir o app com as telas cheias.
 *
 * Fala com a API por HTTP, e não com o banco: assim os dados nascem passando
 * pelas mesmas regras de negócio que o app vai encontrar — inclusive as que
 * geram alerta (RN08, RN12, RN13, RN14), que é justamente o que vale a pena
 * ver na tela.
 *
 * Uso: com a API no ar (`npm run dev` ou `npm run dev:memoria`),
 *   npm run demo:semear
 */

const API = process.env.API_URL ?? 'http://localhost:3333/api';
const CONTA = {
  nome: 'Stephany Marques',
  email: process.env.DEMO_EMAIL ?? 'demo@xepa.app',
  senha: 'Xepa#2026',
};

let token = '';

async function chamar<T>(caminho: string, metodo = 'GET', corpo?: unknown): Promise<T> {
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo !== undefined ? { 'content-type': 'application/json; charset=utf-8' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  });

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!resposta.ok) {
    throw new Error(`${metodo} ${caminho} → ${resposta.status}: ${texto}`);
  }
  return dados as T;
}

/** O mês corrente, para os dados caírem onde o app olha por padrão. */
const mes = new Date().toISOString().slice(0, 7);
const dia = (numero: number) => `${mes}-${String(numero).padStart(2, '0')}`;

async function semear(): Promise<void> {
  console.log(`[demo] semeando em ${API}`);

  // Conta já existente é reaproveitada — o script pode rodar mais de uma vez.
  await chamar('/conta/cadastro', 'POST', CONTA).catch((erro: Error) => {
    if (!erro.message.includes('409')) throw erro;
    console.log('[demo] conta já existia, seguindo');
  });

  const sessao = await chamar<{ token: string }>('/conta/login', 'POST', {
    email: CONTA.email,
    senha: CONTA.senha,
  });
  token = sessao.token;

  // ----- Despensa -----
  const produtos = [
    { nome: 'Arroz', categoria: 'Mantimentos', unidade: 'kg', quantidadeInicial: 5, monitorado: true, quantidadeMinima: 2 },
    { nome: 'Feijão', categoria: 'Mantimentos', unidade: 'kg', quantidadeInicial: 3 },
    // Fica em alerta na hora (RN08): quantidade igual à mínima.
    { nome: 'Café', categoria: 'Mantimentos', unidade: 'pacote', quantidadeInicial: 1, monitorado: true, quantidadeMinima: 1 },
    // RN13 — sabão e amaciante são produtos como os outros; zerado, o alerta
    // de lavanderia acusa falta.
    { nome: 'Sabão em pó', categoria: 'Limpeza', unidade: 'kg', quantidadeInicial: 0, monitorado: true, quantidadeMinima: 1 },
    { nome: 'Amaciante', categoria: 'Limpeza', unidade: 'L', quantidadeInicial: 2 },
  ];
  for (const produto of produtos) {
    await criarIgnorandoRepetido('/despensa/produtos', produto, produto.nome);
  }

  // ----- Grana -----
  await criarIgnorandoRepetido('/grana/contas', { nomeBanco: 'Nubank', saldoInicial: 1200 }, 'Nubank');

  const { categorias } = await chamar<{ categorias: Array<{ id: number; nome: string }> }>(
    '/grana/categorias',
  );
  const idDe = (nome: string) => categorias.find((c) => c.nome === nome)!.id;

  // RN17 — redefinir o mesmo mês atualiza, então repetir é seguro.
  await chamar('/grana/orcamentos', 'POST', {
    categoriaId: idDe('Mercado'),
    mesReferencia: mes,
    valorLimite: 400,
  });

  await chamar('/grana/transacoes', 'POST', {
    tipo: 'entrada',
    valor: 1800,
    data: dia(1),
    descricao: 'Bolsa',
  });
  // Leva o orçamento de Mercado a 92,5% — acima dos 80% da RN12.
  await chamar('/grana/transacoes', 'POST', {
    tipo: 'saida',
    valor: 340,
    data: dia(5),
    categoriaId: idDe('Mercado'),
    descricao: 'Feira do mês',
  });
  await chamar('/grana/transacoes', 'POST', {
    tipo: 'saida',
    valor: 30,
    data: dia(9),
    categoriaId: idDe('Mercado'),
    descricao: 'Padaria',
  });
  await chamar('/grana/transacoes', 'POST', {
    tipo: 'saida',
    valor: 65,
    data: dia(7),
    categoriaId: idDe('Lazer'),
    descricao: 'Cinema',
  });

  // ----- Cabeça -----
  const calculo = await criarMateria('Cálculo I', 'ponderada');
  const algoritmos = await criarMateria('Algoritmos', 'simples');

  if (calculo) {
    // Média ponderada: (6,5×2 + 8,5×3) / 5 = 7,7 — e progressão subindo (RN16).
    await chamar(`/cabeca/materias/${calculo}/avaliacoes`, 'POST', { descricao: 'P1', valor: 6.5, peso: 2, data: '2026-04-10' });
    await chamar(`/cabeca/materias/${calculo}/avaliacoes`, 'POST', { descricao: 'P2', valor: 8.5, peso: 3, data: '2026-06-12' });
    await chamar(`/cabeca/materias/${calculo}/sessoes`, 'POST', { data: dia(9), duracaoMin: 120 });
  }
  if (algoritmos) {
    await chamar(`/cabeca/materias/${algoritmos}/avaliacoes`, 'POST', { descricao: 'Projeto', valor: 9, data: '2026-05-20' });
    await chamar(`/cabeca/materias/${algoritmos}/sessoes`, 'POST', { data: dia(10), duracaoMin: 75 });
  }

  // ----- Roupa -----
  const jeans = await criarPeca('Calça jeans', 'calça', 3);
  await criarPeca('Moletom', 'casaco', 5);
  await criarPeca('Camiseta branca', 'camiseta', 2);

  if (jeans) {
    // Três usos batem o limite: a peça entra na pilha de lavar (RN14).
    for (let i = 0; i < 3; i += 1) {
      await chamar(`/roupa/pecas/${jeans}/uso`, 'POST');
    }
  }

  console.log(`[demo] pronto — entre no app com ${CONTA.email} / ${CONTA.senha}`);
}

/** Recriar o que já existe devolve 409; para o seed, isso é sucesso. */
async function criarIgnorandoRepetido(caminho: string, corpo: unknown, rotulo: string): Promise<void> {
  await chamar(caminho, 'POST', corpo).catch((erro: Error) => {
    if (!erro.message.includes('409')) throw erro;
    console.log(`[demo] "${rotulo}" já existia`);
  });
}

async function criarMateria(nome: string, metodoMedia: string): Promise<number | null> {
  try {
    const { materia } = await chamar<{ materia: { id: number } }>('/cabeca/materias', 'POST', {
      nome,
      metodoMedia,
    });
    return materia.id;
  } catch (erro) {
    if ((erro as Error).message.includes('409')) {
      console.log(`[demo] matéria "${nome}" já existia`);
      return null;
    }
    throw erro;
  }
}

async function criarPeca(nome: string, tipo: string, limiteUsos: number): Promise<number | null> {
  try {
    const { peca } = await chamar<{ peca: { id: number } }>('/roupa/pecas', 'POST', {
      nome,
      tipo,
      limiteUsos,
    });
    return peca.id;
  } catch (erro) {
    if ((erro as Error).message.includes('409')) {
      console.log(`[demo] peça "${nome}" já existia`);
      return null;
    }
    throw erro;
  }
}

semear().catch((erro: Error) => {
  console.error(`[demo] falhou: ${erro.message}`);
  process.exit(1);
});
