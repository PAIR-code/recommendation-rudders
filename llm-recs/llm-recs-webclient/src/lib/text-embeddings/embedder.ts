export interface EmbedResponse {
  embedding: number[];
}

export abstract class Embedder<Params extends {}> {
  public abstract name: string;

  abstract embed(prompt: string, params?: Params): Promise<EmbedResponse>;
}
