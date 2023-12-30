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
import { isErrorResponse } from "../simple-errors/simple-errors";

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

export const DEFAULT_PARAMS: Palm2ApiParams = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  candidateCount: 4,
  maxOutputTokens: 256,
  stopSequences: [],
};

export const DEFAULT_OPTIONS: Palm2ApiOptions = {
  modelId: 'text-bison',
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  requestParameters: DEFAULT_PARAMS,
};

export type Palm2Response = Palm2ValidResponse | Palm2Error;

export function preparePalm2Request(
  text: string, params?: Partial<Palm2ApiParams>
): Palm2ApiRequest {
  return {
    instances: [{ content: text }],
    parameters:
      (params && Object.assign({ ...DEFAULT_PARAMS }, params)) || DEFAULT_PARAMS
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

export interface Palm2ApiOptions {
  modelId: string,
  apiEndpoint: string,
  requestParameters: Palm2ApiParams
}

// TODO: consider using lodash merge...
function overideOptions(
  oldOptions: Palm2ApiOptions,
  newOptions?: Partial<Palm2ApiOptions>,
): Palm2ApiOptions {
  const finalOptions: Palm2ApiOptions = (newOptions &&
    Object.assign({ ...oldOptions }, newOptions)) || oldOptions;
  if (newOptions && newOptions.requestParameters) {
    finalOptions.requestParameters =
      Object.assign({ ...oldOptions.requestParameters }, newOptions.requestParameters);
  }
  return finalOptions;
}

export class VertexPalm2LLM implements LLM<Palm2ApiOptions> {
  public name: string;
  public defaultOptions: Palm2ApiOptions;

  constructor(
    public projectId: string,
    public client: AuthClient,
    public initOptions?: Partial<Palm2ApiOptions>,
  ) {
    this.defaultOptions = overideOptions(DEFAULT_OPTIONS, initOptions);
    this.name = `VertexLLM:` + this.defaultOptions.modelId;
  }

  async predict(
    query: string, options?: Palm2ApiOptions
  ): Promise<PredictResponse> {
    const usedOptions = overideOptions(this.defaultOptions, options);
    const apiRequest: Palm2ApiRequest = {
      instances: [{ content: query }],
      parameters: usedOptions.requestParameters
    }

    const apiResponse = await sendPalm2Request(
      this.projectId,
      this.client,
      apiRequest,
      this.defaultOptions.modelId,
      this.defaultOptions.apiEndpoint);

    // The API doesn't include the actual stop sequence that it found, so we
    // can never know the true stop seqeunce, so we just pick the first one,
    // and image it is that.
    const stopSequences = usedOptions.requestParameters.stopSequences;
    const imaginedPostfixStopSeq = stopSequences.length > 0 ?
      stopSequences[0] : '';

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
