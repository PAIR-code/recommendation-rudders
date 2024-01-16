/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Embedder, EmbedResponse as EmbedResponse } from "./embedder";

/*
Google Cloud Vertex Embedding API
See: https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings
(Same models as Google Generative AI Developer API but different API)

Takes project ID and access token.
*/

export interface EmbedRequestParams { };

export interface EmbedRequest {
  instances: { content: string }[]
}

export interface VertexEmbedding {
  predictions: {
    embeddings: {
      statistics: {
        truncated: boolean;
        token_count: number;
      };
      values: number[];
    }
  }[];
  metadata: {
    billableCharacterCount: number;
  }
}

export interface VertexEmbedError {
  error: {
    code: number;
    details: unknown[];
    message: string;
    status: string;
  }
}

export type VertexEmbedResponse = VertexEmbedding | VertexEmbedError;

function isErrorResponse(response: VertexEmbedResponse): response is VertexEmbedError {
  if ((response as VertexEmbedError).error) {
    return true;
  }
  return false;
}

export function prepareEmbedRequest(text: string, options?: EmbedRequestParams): EmbedRequest {
  return {
    instances: [{ content: text }],
  };
}

async function postDataToLLM(
  url = '',
  accessToken: string,
  data: EmbedRequest
): Promise<VertexEmbedResponse> {
  // Default options are marked with *
  const response = await fetch(url, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  // const text = await response.text()
  // console.log('text', text);
  // return JSON.parse(text);
  return response.json(); // parses JSON response into native JavaScript objects
}

export async function sendEmbedRequest(
  projectId: string,
  accessToken: string,
  req: EmbedRequest,
  modelId = 'textembedding-gecko', // e.g. textembedding-gecko embedding model
  apiEndpoint = 'us-central1-aiplatform.googleapis.com',
): Promise<VertexEmbedResponse> {
  return await postDataToLLM(
    // TODO: it may be that the url part 'us-central1' has to match
    // apiEndpoint.
    `https://${apiEndpoint}/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:predict`,
    accessToken,
    req
  );
}

interface EmbedApiOptions {
  modelId: string,
  apiEndpoint: string,
}

export class VertexEmbedder implements Embedder<EmbedApiOptions> {
  public name: string;
  public defaultOptions: EmbedApiOptions = {
    modelId: 'textembedding-gecko',
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  };

  constructor(
    public projectId: string,
    public accessToken: string,
  ) {
    this.name = `VertexEmbedder:` + this.defaultOptions.modelId;
  }

  async embed(
    query: string, params?: EmbedApiOptions
  ): Promise<EmbedResponse> {

    const apiRequest = prepareEmbedRequest(query);
    const apiResponse = await sendEmbedRequest(
      this.projectId,
      this.accessToken,
      apiRequest,
      params ? params.modelId : this.defaultOptions.modelId,
      params ? params.apiEndpoint : this.defaultOptions.apiEndpoint);
    if (isErrorResponse(apiResponse)) {
      return { error: apiResponse.error.message };
    }
    return { embedding: apiResponse.predictions[0].embeddings.values };
  }
}
