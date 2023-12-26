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
import * as path from 'path';

export const app: Express = express();
app.use(express.static('./static'));
app.use(express.json());  // for POST requests
app.use(express.urlencoded({ extended: true }));  // for PUT requests

interface SimpleEmbedRequest {
  text: string;
}

async function main() {

  const auth = new GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/cloud-platform',
    ]
  });
  const projectId = await auth.getProjectId();
  const client = await auth.getClient();
  const credentials = await auth.getCredentials();
  const serviceAccountEmail = credentials.client_email;
  console.log('Running as serviceAccountEmail: ', serviceAccountEmail);

  const embedder = new VertexEmbedder(client, projectId);

  app.get('/submit', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '/views/form.html'));
  });

  app.post('/submit', (req: Request, res: Response) => {
    console.log({
      name: req.body.name,
      message: req.body.message,
    });
    res.send('Thanks for your message!');
  });

  app.post('/api/embed', async (req: Request, res: Response) => {
    const embedding = await embedder.embed((req.body as SimpleEmbedRequest).text);
    res.send(embedding);
  });

  // Listen to the App Engine-specified port, or 8080 otherwise
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
  });
}

main().catch(console.error);

// module.exports = app;
