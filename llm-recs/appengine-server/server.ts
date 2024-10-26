/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import express, { Express, Request, Response } from 'express';
import { GoogleAuth } from 'google-auth-library';
import { VertexEmbedder } from './src/text-embeddings/embedder_gaxois_vertexapi';
import { VertexGeminiLLM } from 'ts-llmt/src/llm_vertexapi_gemini_1_5_googleauth';
import {
  GeminiApiOptions,
  GeminiRequestOptions,
} from 'ts-llmt/src/llm_vertexapi_gemini_lib';

export const app: Express = express();
app.use(express.static('./static'));
app.use(express.json()); // for POST requests
app.use(express.urlencoded({ extended: true })); // for PUT requests

export interface LlmOptions {
  modelId?: string; // e.g. text-bison
  candidateCount?: number; // e.g. 1 to 8 = number of completions
  maxOutputTokens?: number; // e.g. 256, 1024
  stopSequences?: string[]; // e.g. ']
  temperature?: number; // e.g. 0.8 (0=deterministic, 0.7-0.9=normal, x>1=wild)
  topP?: number; // e.g. 0.8 (0-1, smaller = restricts crazyiness)
  topK?: number; // e.g. 40 (0-numOfTokens, smaller = restricts crazyiness)
}

export interface LlmRequest {
  text: string;
  params?: LlmOptions;
}

export interface SimpleEmbedRequest {
  text: string;
}

async function main() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const projectId = await auth.getProjectId();
  const client = await auth.getClient();
  const credentials = await auth.getCredentials();
  const serviceAccountEmail = credentials.client_email;
  console.log('Running as serviceAccountEmail: ', serviceAccountEmail);

  const embedder = new VertexEmbedder(client, projectId);

  app.post('/api/embed', async (req: Request, res: Response) => {
    console.log(`${new Date()}: /api/embed`);
    const query = (req.body as SimpleEmbedRequest).text;
    if (query.trim() === '') {
      return res.send({ error: 'Empty string does not have an embedding.' });
    }
    const embedding = await embedder.embed(query);
    res.send(embedding);
  });

  app.post('/api/llm', async (req: Request, res: Response) => {
    console.log(`${new Date()}: /api/llm`);
    const request = req.body as LlmRequest;
    // Convert from LlmRequest to VertexAI LLM request.
    const inputRequestParameters = { ...request.params };
    delete inputRequestParameters.modelId;
    const requestOptions = inputRequestParameters as GeminiRequestOptions;

    // TODO: we now have duplicated definitions of default options, we might want to
    // remove one of them.
    const options: GeminiApiOptions = {
      modelId:
        (request.params && request.params.modelId) || 'gemini-1.5-flash-002',
      location: 'us-central1',
      requestOptions,
    };
    const llm = new VertexGeminiLLM(projectId, client, options);
    const response = await llm.predict(request.text, options);
    res.send(response);
  });

  // Listen to the App Engine-specified port, or 8080 otherwise
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
  });
}

main().catch(console.error);

// module.exports = app;
