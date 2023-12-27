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
import { Palm2ApiOptions, Palm2ApiParams } from "./llm_vertexapi_palm2";

interface LlmRequest {
  text: string
  params?: Palm2ApiOptions
}

async function sendLlmRequest(request: LlmRequest): Promise<PredictResponse> {
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
  return (await response.json() as PredictResponse); // parses JSON response into native JavaScript objects
}

export class SimpleLlm implements LLM<{}> {
  public name: string;
  constructor() {
    this.name = `SimpleLlm`
  }
  async predict(
    text: string, params?: Palm2ApiOptions
  ): Promise<PredictResponse> {
    const apiResponse = await sendLlmRequest({ text, params });
    return apiResponse
  }
}