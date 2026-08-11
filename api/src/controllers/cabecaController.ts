import type { Request, Response } from 'express';
import { z } from 'zod';
import * as cabecaService from '../services/cabecaService.js';
import { usuarioAutenticado } from '../middlewares/autenticar.js';
import { badRequest } from '../utils/errors.js';

/** Entrada HTTP do Módulo 4 — Cabeça. */

const idPositivo = z.coerce.number().int().positive();

function param(req: Request, nome: string, rotulo: string): number {
  const resultado = idPositivo.safeParse(req.params[nome]);
  if (!resultado.success) throw badRequest(`Identificador de ${rotulo} inválido.`);
  return resultado.data;
}

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD.');

const materiaSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome da matéria.').max(120),
  // RN15 — o usuário escolhe como a média daquela matéria é calculada.
  metodoMedia: z.enum(['simples', 'ponderada']).default('simples'),
});

const edicaoMateriaSchema = z
  .object({
    nome: z.string().trim().min(1, 'O nome não pode ficar em branco.').max(120).optional(),
    metodoMedia: z.enum(['simples', 'ponderada']).optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: 'Envie ao menos um campo para atualizar.',
  });

const avaliacaoSchema = z.object({
  descricao: z.string().trim().min(1, 'Descreva a avaliação.').max(120),
  valor: z.number().min(0, 'A nota não pode ser negativa.'),
  peso: z.number().positive('O peso precisa ser maior que zero.').optional(),
  data,
});

const sessaoSchema = z.object({
  data,
  duracaoMin: z
    .number()
    .int('A duração deve ser em minutos inteiros.')
    .positive('A duração precisa ser maior que zero.')
    .max(24 * 60, 'Uma sessão não pode passar de 24 horas.'),
});

/** GET /api/cabeca/materias */
export async function listarMaterias(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  res.status(200).json({ materias: await cabecaService.listarMaterias(id) });
}

/** SD16 — POST /api/cabeca/materias */
export async function cadastrarMateria(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const { nome, metodoMedia } = materiaSchema.parse(req.body);
  res.status(201).json({ materia: await cabecaService.cadastrarMateria(id, nome, metodoMedia) });
}

/** PUT /api/cabeca/materias/:id */
export async function editarMateria(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const dados = edicaoMateriaSchema.parse(req.body);
  const materia = await cabecaService.editarMateria(id, param(req, 'id', 'matéria'), dados);
  res.status(200).json({ materia });
}

/** SD18 — POST /api/cabeca/materias/:id/avaliacoes */
export async function registrarAvaliacao(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const dados = avaliacaoSchema.parse(req.body);
  const avaliacao = await cabecaService.registrarAvaliacao(
    id,
    param(req, 'id', 'matéria'),
    dados,
  );
  res.status(201).json({ avaliacao });
}

/** GET /api/cabeca/materias/:id/avaliacoes */
export async function listarAvaliacoes(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const avaliacoes = await cabecaService.listarAvaliacoes(id, param(req, 'id', 'matéria'));
  res.status(200).json({ avaliacoes });
}

/** DELETE /api/cabeca/avaliacoes/:id */
export async function removerAvaliacao(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  await cabecaService.removerAvaliacao(id, param(req, 'id', 'avaliação'));
  res.status(204).send();
}

/** SD19 — POST /api/cabeca/materias/:id/sessoes */
export async function registrarSessao(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const { data: dataSessao, duracaoMin } = sessaoSchema.parse(req.body);
  const sessao = await cabecaService.registrarSessao(
    id,
    param(req, 'id', 'matéria'),
    dataSessao,
    duracaoMin,
  );
  res.status(201).json({ sessao });
}

/** GET /api/cabeca/materias/:id/sessoes */
export async function listarSessoes(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  const sessoes = await cabecaService.listarSessoes(id, param(req, 'id', 'matéria'));
  res.status(200).json({ sessoes });
}

/** SD20 — GET /api/cabeca/materias/:id/desempenho */
export async function obterDesempenho(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  res.status(200).json(await cabecaService.obterDesempenho(id, param(req, 'id', 'matéria')));
}

/** RF028 — GET /api/cabeca/desempenho */
export async function obterPanorama(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  res.status(200).json(await cabecaService.obterPanorama(id));
}

/** SD17 — POST /api/cabeca/importar */
export async function importarNotas(req: Request, res: Response) {
  const { id } = usuarioAutenticado(req);
  res.status(200).json(await cabecaService.importarNotas(id));
}
