/** Formato de erro que o `errorHandler` da API devolve, em qualquer rota. */
export interface ErroApi {
  erro: {
    codigo: string;
    mensagem: string;
    detalhes?: unknown;
  };
}
