/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/*
Google Cloud Vertex Palm2 API
See: https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/text
(same models as Google Generative AI Developer API but different API)
*/

import { AuthClient } from "google-auth-library";
import { LLM, PredictResponse } from "./llm";

export interface Palm2ApiParams {
  candidateCount: number, // 1 to 8
  maxOutputTokens: number, // 256, 1024
  stopSequences: string[], // e.g. ']
  temperature: number,  // e.g. 0.2 (0=deterministic, 1=wild, x>1=crazy)
  topP: number,  // e.g. 0.8 (0-1, smaller = restricts crazyiness)
  topK: number  // e.g. 40 (0-numOfTokens, smaller = restricts crazyiness)
}

export interface Palm2ApiRequest {
  instances: { content: string }[]
  parameters: Palm2ApiParams
}
export type Palm2RequestOptions = Omit<Partial<Palm2ApiRequest>, 'prompt'>;

export interface Palm2ValidResponse {
  predictions:
  {
    content: string,
    citationMetadata: {
      citations: {}[]
    },
    safetyAttributes: {
      blocked: boolean, categories: {}[], scores: {}[]
    }
  }[],
  metadata: {
    tokenMetadata: {
      outputTokenCount: {
        totalBillableCharacters: number,
        totalTokens: number
      },
      inputTokenCount: {
        totalBillableCharacters: number,
        totalTokens: number
      },
    }
  }
}

export interface Palm2Error {
  error: {
    code: number;
    details: unknown[];
    message: string;
    status: string;
  }
}

function isErrorResponse(response: Palm2Response
  ): response is Palm2Error {
    if ((response as Palm2Error).error) {
      return true;
    }
    return false;
  }

export type Palm2Response = Palm2ValidResponse | Palm2Error;

export function preparePalm2Request(text: string, options?: Palm2ApiParams): Palm2ApiRequest {
  return {
    instances: [{ content: text }],
    parameters: {
      temperature: (options && options.temperature) || 0.7,
      topK: (options && options.topK) || 40,
      topP: (options && options.topP) || 0.95,
      candidateCount: (options && options.candidateCount) || 4,
      maxOutputTokens: (options && options.maxOutputTokens) || 256,
      stopSequences: (options && options.stopSequences) || [],
    }
  };
}

async function postDataToLLM(url = '', client: AuthClient, data: Palm2ApiRequest) {
  // Default options are marked with *
  const response = await client.request<Palm2Response>({
    url,
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.data;
}

export async function sendPalm2Request(
  projectId: string,
  client: AuthClient,
  req: Palm2ApiRequest,
  modelId = 'text-bison', // e.g. text-bison for latest text-bison model
  apiEndpoint = 'us-central1-aiplatform.googleapis.com',
): Promise<Palm2Response> {
  return postDataToLLM(
    // TODO: it may be that the url part 'us-central1' has to match
    // apiEndpoint.
    `https://${apiEndpoint}/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:predict`,
    client,
    req
  );
}

interface Palm2ApiOptions {
  modelId: string,
  apiEndpoint: string,
  requestParameters: Palm2ApiParams
}

export class VertexPalm2LLM implements LLM<Palm2ApiOptions> {
  public name: string;
  public options: Palm2ApiOptions;

  constructor(
    public projectId: string,
    public client: AuthClient,
    public params?: Palm2ApiOptions,
  ) {
    const defaultOptions = {
      modelId: 'text-bison',
      apiEndpoint: 'us-central1-aiplatform.googleapis.com',
      requestParameters: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        candidateCount: 4,
        maxOutputTokens: 256,
        stopSequences: [],
      }
    } as Palm2ApiOptions;
    this.options = params ? params : defaultOptions;
    this.name = `VertexLLM:` + this.options.modelId;
  }

  async predict(
    query: string, params?: Palm2ApiOptions
  ): Promise<PredictResponse> {

    const apiParams = params ? params.requestParameters
      : this.options.requestParameters;
    const apiRequest: Palm2ApiRequest = {
      instances: [{ content: query }],
      parameters: apiParams
    }

    const apiResponse = await sendPalm2Request(
      this.projectId,
      this.client,
      apiRequest,
      this.options.modelId,
      this.options.apiEndpoint);

    // The API doesn't include the actual stop sequence that it found, so we
    // can never know the true stop seqeunce, so we just pick the first one,
    // and image it is that.
    const imaginedPostfixStopSeq = apiParams.stopSequences.length > 0 ?
      apiParams.stopSequences[0] : '';

    if (isErrorResponse(apiResponse)) {
      throw new Error(`Error in api response:` +
      ` ${JSON.stringify(apiResponse.error, null, 2)}`);
    }

    if (!apiResponse.predictions) {
      throw new Error(`No predictions returned in api response:` +
        ` ${JSON.stringify(apiResponse, null, 2)}`);
    }

    // TODO: skip this and simplify?
    const scoredCompletions = apiResponse.predictions.map(p => {
      return {
        query: query,
        completion: p.content + imaginedPostfixStopSeq,
        score: 1, // TODO: API doesn't provide this, so we fake it as always 1.
      }
    });

    return { completions: scoredCompletions.map(c => c.completion) }
  }

  // TODO: The cloud API doesn't currently support scoring.
  // async score(request: ScoreRequest): Promise<ScoreResponse> {
  // }

}
