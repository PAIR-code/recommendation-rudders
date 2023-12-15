import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export interface SheetInfoOrError {
  error?: string;
  sheets?: gapi.client.sheets.Sheet[];
}

type SheetResponse = gapi.client.Response<gapi.client.sheets.Spreadsheet>;

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

@Injectable({
  providedIn: 'root'
})
export class GoogleSheetsService {
  onceReady: Promise<void>;

  constructor() {
    this.onceReady = new Promise(
      (resolve, _reject) => {
        gapi.load('client', async () => {
          await gapi.client.init({
            apiKey: environment.sheetsApiKey,
            discoveryDocs: [DISCOVERY_DOC],
          });
          resolve();
        });
      });
  }

  async getSheetInfo(steetIdOrUrl: string,
    accessToken?: google.accounts.oauth2.TokenResponse | null
  ): Promise<SheetInfoOrError> {
    await this.onceReady;

    const match =
      steetIdOrUrl.match(/^(https\:\/\/docs\.google\.com\/spreadsheets\/d\/)?([a-zA-Z0-9_\-]{5,})\/?/);
    if (!match) {
      return { error: 'No sheet URL or ID entered.' };
    }

    const sheetId = match[2];
    console.log('sheetId:', sheetId);

    /**
     * A sample public spreadsheet for testing (that doesn't need the user to be signed in):
     * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
     */
    // let response;
    try {
      // Fetch first 10 files
      const request = {
        spreadsheetId: sheetId,
      } as {
        spreadsheetId: string,
        access_token?: string,
      };
      if (accessToken) {
        request.access_token = accessToken.access_token
      }

      const spreadsheetResponse = await gapi.client.sheets.spreadsheets.get(request);
      // console.log(spreadsheetResponse);
      // console.log(spreadsheetResponse.status);
      if (spreadsheetResponse.status !== 200) {
        return { error: spreadsheetResponse.statusText };
      }
      // console.log(spreadsheetResponse.result)
      // response = await gapi.client.sheets.spreadsheets.values.get({
      //   spreadsheetId: sheetId,
      //   range: 'Class Data!A2:E',
      // });
      return {
        sheets: spreadsheetResponse.result.sheets
      }
    } catch (err: unknown) {
      const sheetResponseError = err as SheetResponse;
      console.warn(err);
      if (sheetResponseError.status === 404) {
        return { error: 'No such spreadsheet exists. Maybe the ID or URL is mistyped? (404)' };
      }
      else if (sheetResponseError.status === 403) {
        return { error: 'You do not have permission to access this sheet. You need to login with an account that has access, or have the owner make it publicly viewable. (403)' };
      }
      // else if (sheetResponseError.status === 404) {
      // }
      return { error: `Unknown error (${sheetResponseError.status}), sorry.` };
    }
    // const range = response.result;
    // if (!range || !range.values || range.values.length == 0) {
    //   console.warn('No values found.');
    //   return;
    // }
    // // Flatten to string to display
    // const output = range.values.reduce(
    //   (str: string, row: string[]) => `${str}${row[0]}, ${row[4]}\n`,
    //   'Name, Major:\n');
    // console.log(output);
  }
}


