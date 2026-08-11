import type { Request, Response } from 'express';
import { z } from 'zod';
import * as granaService from '../services/granaService.js';
import { usuarioAutenticado } from '../middlewares/autenticar.js';
import { badRequest } from '../utils/errors.js';

/** Entrada HTTP do Módulo 3 — Grana. */

const idParam = z.coerce.number().int().positive();

function paramId(req: Request, rotulo = 'recurso'): number {
  const resultado = idParam.safeParse(req.params.id);
  if (!resultado.success) throw badRequest(`Identificador de ${rotulo} inválido.`);
  return resultado.data;
}

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD.');
const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês no formato AAAA-MM.');
const dinheiro = z.number().positive('O valor precisa ser maior que zero.');

const contaSchema = z.object({
  nomeBanco: z.string().trim().min(1, 'Informe o nome do banco.').max(80),
  saldoInicial: z.number().default(0),
});

const categoriaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da categoria.').max(60),
});

const lancamentoSchema = z.object({
  tipo: z.enum(['entrada', 'saida']),
  valor: dinheiro,
  data,
  categoriaId: z.number().int().positive().nullable().optional(),
  contaId: z.number().int().positive().nullable().optional(),
  descricao: z.string().trim().max(160).nullable().optional(),
});

const orcamentoSchema = z.object({
  categoriaId: z.number().int().positive(),
  mesReferencia: mes,
  valorLimite: dinheiro,
});

const periodoSchema = z.object({
  mes: mes.optional(),
  de: data.optional(),
  ate: data.optional(),
});

const filtroTransacoesSchema = periodoSchema.extend({
  categoriaId: z.coerce.number().int().positive().optional(),
  contaId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(['entrada', 'saida']).optional(),
  limite: z.coerce.number().int().positive().max(500).optional(),
});

/** SD11 — POST /api/grana/contas */
export async function cadastrarConta(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const { nomeBanco, saldoInicial } = contaSchema.parse(req.body);
  res.status(201).json({ conta: await granaService.cadastrarConta(id, nomeBanco, saldoInicial) });
}

/** RF019 / RN10 — GET /api/grana/contas */
export async function listarContas(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  res.status(200).json({ contas: await granaService.listarContas(id) });
}

/** GET /api/grana/categorias */
export async function listarCategorias(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  res.status(200).json({ categorias: await granaService.listarCategorias(id) });
}

/** POST /api/grana/categorias */
export async function criarCategoria(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const { nome } = categoriaSchema.parse(req.body);
  res.status(201).json({ categoria: await granaService.criarCategoria(id, nome) });
}

/** SD13 — POST /api/grana/transacoes */
export async function registrarLancamento(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const dados = lancamentoSchema.parse(req.body);
  res.status(201).json(await granaService.registrarLancamentoManual(id, dados));
}

/** SD12 — POST /api/grana/transacoes/auto */
export async function registrarLancamentoAutomatico(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const dados = lancamentoSchema.parse(req.body);
  res.status(201).json(await granaService.registrarLancamentoAutomatico(id, dados));
}

/** GET /api/grana/transacoes */
export async function listarTransacoes(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const filtro = filtroTransacoesSchema.parse(req.query);
  res.status(200).json({ transacoes: await granaService.listarTransacoes(id, filtro) });
}

/** SD14 — GET /api/grana/resumo */
export async function obterResumo(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const filtro = periodoSchema.parse(req.query);
  res.status(200).json(await granaService.obterResumo(id, filtro));
}

/** SD15 — POST /api/grana/orcamentos */
export async function definirOrcamento(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const { categoriaId, mesReferencia, valorLimite } = orcamentoSchema.parse(req.body);
  const { orcamento, criado } = await granaService.definirOrcamento(
    id,
    categoriaId,
    mesReferencia,
    valorLimite,
  );
  // RN17: redefinir o orçamento do mês atualiza o que existe, não cria outro.
  res.status(criado ? 201 : 200).json({ orcamento });
}

/** RF021 — GET /api/grana/orcamentos */
export async function listarOrcamentos(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const filtro = z.object({ mes: mes.optional() }).parse(req.query);
  const mesReferencia = filtro.mes ?? new Date().toISOString().slice(0, 7);
  res.status(200).json({
    mesReferencia,
    orcamentos: await granaService.listarOrcamentos(id, mesReferencia),
  });
}

/** DELETE /api/grana/orcamentos/:id */
export async function removerOrcamento(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  await granaService.removerOrcamento(id, paramId(req, 'orçamento'));
  res.status(204).send();
}
