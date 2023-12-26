/*==============================================================================
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

/* Test call to The Google-Cloud-Vertex-AI-API Palm2 LLM.

Usage:

npx ts-node --esm ./run_embedder_gaxois.ts \
  --project=$(gcloud config get-value project)
*/
import { VertexEmbedder, prepareEmbedRequest } from '../embedder_gaxois_vertexapi';
import { isEmbedError } from '../embedder';
import { GoogleAuth } from 'google-auth-library';

import * as yargs from 'yargs';

interface Params {
  project?: string,
}

async function run(args: Params): Promise<void> {
  const auth = new GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
    ]
  });
  const projectId = args.project || await auth.getProjectId();
  const client = await auth.getClient();
  const embedder = new VertexEmbedder(client, projectId);

  const text = `I am a hungry hippo`;
  const response = await embedder.embed(text);
  if (isEmbedError(response)) {
    console.error(response.error)
  } else {
    console.log(JSON.stringify(response.embedding));
  }
}

// ----------------------------------------------------------------------------
const args = yargs
  .option('project', {
    describe: 'The Google Cloud Project to use (it must have the VertexAI ' +
      'API enabled).',
    demandOption: false,
    type: 'string',
  }).help().argv;

run(args as Params)
  .then(() => {
    console.log('Success!');
  })
  .catch(e => {
    console.error('Failed: ', e);
    throw Error('Failed');
  });
