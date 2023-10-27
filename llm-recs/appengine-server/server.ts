/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import express, { Express, Request, Response } from 'express';
import * as path from 'path';

const PORT = process.env.PORT || 8080;
export const app: Express = express();

// This middleware is available in Express v4.16.0 onwards
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from App Engine!');
});

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

// Listen to the App Engine-specified port, or 8080 otherwise
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

// module.exports = app;
