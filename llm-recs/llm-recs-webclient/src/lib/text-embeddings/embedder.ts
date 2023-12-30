export interface Embedding {
  embedding: number[];
}

export interface EmbedError {
  error: string;
}

export type EmbedResponse = Embedding | EmbedError;


export function isEmbedError<T>(response: T | EmbedError): response is EmbedError {
  if ((response as EmbedError).error) {
    return true;
  }
  return false;
}

export function isNotEmbedError<T>(response: T | EmbedError): response is Exclude<T, EmbedError> {
  if ((response as EmbedError).error) {
    return true;
  }
  return false;
}

export abstract class Embedder<Params extends {}> {
  public abstract name: string;

  abstract embed(prompt: string, params?: Params): Promise<EmbedResponse>;
}
