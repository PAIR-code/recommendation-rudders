/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { AuthClient } from 'google-auth-library';
import { Embedder, EmbedResponse as EmbedResponse } from './embedder';

/*
Google Cloud Vertex Embedding API
See: https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings
(Same models as Google Generative AI Developer API but different API)

Uses Google-auth-client so that it handles refreshing tokens for API use.
*/

export interface EmbedRequestParams {}

export interface EmbedRequest {
  instances: { content: string }[];
}

export interface VertexEmbedding {
  predictions: {
    embeddings: {
      statistics: {
        truncated: boolean;
        token_count: number;
      };
      values: number[];
    };
  }[];
  metadata: {
    billableCharacterCount: number;
  };
}

export interface VertexEmbedError {
  error: {
    code: number;
    details: unknown[];
    message: string;
    status: string;
  };
}

export type VertexEmbedResponse = VertexEmbedding | VertexEmbedError;

function isErrorResponse(
  response: VertexEmbedResponse
): response is VertexEmbedError {
  if ((response as VertexEmbedError).error) {
    return true;
  }
  return false;
}

export function prepareEmbedRequest(
  text: string,
  options?: EmbedRequestParams
): EmbedRequest {
  return {
    instances: [{ content: text }],
  };
}

async function postDataToLLM(
  url = '',
  client: AuthClient,
  data: EmbedRequest
): Promise<VertexEmbedResponse> {
  const response = await client.request<VertexEmbedResponse>({
    url,
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.data;
}

export async function sendEmbedRequest(
  projectId: string,
  client: AuthClient,
  req: EmbedRequest,
  modelId = 'text-embedding-004', // e.g. textembedding-gecko embedding model
  location = 'us-central1'
): Promise<VertexEmbedResponse> {
  return await postDataToLLM(
    // TODO: it may be that the url part 'us-central1' has to match
    // apiEndpoint.
    `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:predict`,
    client,
    req
  );
}

interface EmbedApiOptions {
  modelId: string;
  apiEndpoint: string;
}

export class VertexEmbedder implements Embedder<EmbedApiOptions> {
  public name: string;
  public defaultOptions: EmbedApiOptions = {
    modelId: 'textembedding-gecko',
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  };

  constructor(public client: AuthClient, public projectId: string) {
    this.name = `VertexEmbedder:` + this.defaultOptions.modelId;
  }

  async embed(query: string, params?: EmbedApiOptions): Promise<EmbedResponse> {
    const apiRequest = prepareEmbedRequest(query);
    const apiResponse = await sendEmbedRequest(
      this.projectId,
      this.client,
      apiRequest,
      params ? params.modelId : this.defaultOptions.modelId,
      params ? params.apiEndpoint : this.defaultOptions.apiEndpoint
    );
    if (isErrorResponse(apiResponse)) {
      return { error: apiResponse.error.message };
    }
    return { embedding: apiResponse.predictions[0].embeddings.values };
  }
}
