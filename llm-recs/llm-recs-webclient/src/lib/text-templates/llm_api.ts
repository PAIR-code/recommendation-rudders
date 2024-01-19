/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/*
An class to wrap, and provide a common interface for LLM behaviour.
*/
import { LLM, PredictResponse } from "./llm";
import { ErrorResponse } from "../simple-errors/simple-errors";

export interface LlmOptions {
  modelId?: string; // e.g. text-bison
  candidateCount?: number, // e.g. 1 to 8 = number of completions
  maxOutputTokens?: number, // e.g. 256, 1024
  stopSequences?: string[], // e.g. ']
  temperature?: number,  // e.g. 0.8 (0=deterministic, 0.7-0.9=normal, x>1=wild)
  topP?: number,  // e.g. 0.8 (0-1, smaller = restricts crazyiness)
  topK?: number  // e.g. 40 (0-numOfTokens, smaller = restricts crazyiness)
}

export interface LlmRequest {
  text: string
  params?: LlmOptions
}

async function sendLlmRequest(request: LlmRequest): Promise<PredictResponse|ErrorResponse> {
  // Default options are marked with *
  const response = await fetch(`/api/llm`, {
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
    mode: 'cors', // no-cors, *cors, same-origin
    cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    credentials: 'same-origin', // include, *same-origin, omit
    headers: {
      'Content-Type': 'application/json',
    },
    redirect: 'follow', // manual, *follow, error
    referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(request), // body data type must match "Content-Type" header
  });
  console.log(response);
  if (response.status !== 200) {
    return {
      error: `${response.status}: response.statusText`
    };
  }
  let prediction: PredictResponse;
  try {
    prediction = (await response.json() as PredictResponse)
  } catch (err) {
    console.error('invalid json in response.body: ', response.body);
    return {
      error: `response is not valid JSON.`
    };
  }
  return prediction; // parses JSON response into native JavaScript objects
}

export class SimpleLlm implements LLM<LlmOptions> {
  public name: string;
  public defaultOptions: LlmOptions = {};

  constructor(initialOptions?: LlmOptions) {
    this.name = `SimpleLlm`
    if (initialOptions) {
      this.defaultOptions = initialOptions;
    }
  }
  async predict(text: string, params?: LlmOptions): Promise<PredictResponse | ErrorResponse> {
    const usedParams = { ...this.defaultOptions };
    if (params) {
      Object.assign(usedParams, params);
    }
    const apiResponse = await sendLlmRequest({ text, params: usedParams });
    return apiResponse
  }
}
