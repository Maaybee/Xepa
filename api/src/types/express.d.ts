import type { PerfilPublico } from '../models/usuario.js';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido pelo middleware `autenticar` em rotas protegidas. */
      usuario?: PerfilPublico;
    }
  }
}

export {};
