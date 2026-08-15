/** Módulo 4 — Cabeça (SD16–SD20). */

import type {
  Avaliacao,
  DesempenhoMateria,
  Materia,
  MetodoMedia,
  Panorama,
} from '@/types/api';
import { requisitar } from './cliente';

export function listarMaterias() {
  return requisitar<{ materias: Materia[] }>('/cabeca/materias');
}

/** RN15 — o método da média é escolhido por matéria. */
export function cadastrarMateria(nome: string, metodoMedia: MetodoMedia) {
  return requisitar<{ materia: Materia }>('/cabeca/materias', {
    metodo: 'POST',
    corpo: { nome, metodoMedia },
  });
}

export function editarMateria(materiaId: number, dados: { nome?: string; metodoMedia?: MetodoMedia }) {
  return requisitar<{ materia: Materia }>(`/cabeca/materias/${materiaId}`, {
    metodo: 'PUT',
    corpo: dados,
  });
}

export function listarAvaliacoes(materiaId: number) {
  return requisitar<{ avaliacoes: Avaliacao[] }>(`/cabeca/materias/${materiaId}/avaliacoes`);
}

/** SD18 — entrada manual de nota (RF024), o caminho principal. */
export function registrarAvaliacao(
  materiaId: number,
  dados: { descricao: string; valor: number; peso?: number; data: string },
) {
  return requisitar<{ avaliacao: Avaliacao }>(`/cabeca/materias/${materiaId}/avaliacoes`, {
    metodo: 'POST',
    corpo: dados,
  });
}

export function registrarSessao(materiaId: number, data: string, duracaoMin: number) {
  return requisitar<{ sessao: { id: number; data: string; duracaoMin: number } }>(
    `/cabeca/materias/${materiaId}/sessoes`,
    { metodo: 'POST', corpo: { data, duracaoMin } },
  );
}

/** RF026/RF028 — panorama de todas as matérias. */
export function obterPanorama() {
  return requisitar<Panorama>('/cabeca/desempenho');
}

/**
 * SD20 — desempenho de uma matéria só. É esta rota, e não a do panorama, que
 * traz `progressao` (RF027): a série de notas com a média acumulada ponto a
 * ponto, que é o que o gráfico de evolução desenha.
 */
export function obterDesempenho(materiaId: number) {
  return requisitar<DesempenhoMateria>(`/cabeca/materias/${materiaId}/desempenho`);
}

/**
 * SD17 — RN05: exige vínculo institucional. Responde 503 quando a instituição
 * não expõe integração, que é o caso da maioria.
 */
export function importarNotas() {
  return requisitar<{
    instituicao: string;
    importadas: number;
    ignoradas: number;
    materiasCriadas: string[];
  }>('/cabeca/importar', { metodo: 'POST' });
}
