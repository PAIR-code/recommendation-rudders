# LlmRecsWebclient

## Development server

Run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

Note: this will redirect API calls to http://localhost:8080/ This uses the backend API-server in [`../appengine-server`](../appengine-server) so you should also run in a separate tab:

```sh
cd ../appengine-server
npm run start
```

You'll see local logs printed there form the backend server. This backend server will itself you gcloud default credentials, so it assumes you have that setup. You can see the docs in [`../appengine-server/README`](../appengine-server/README) for more information.

## Cloud project setup

The webpage hosted service uses an API key to allow it to access Sheets and Drive APIs. This means you have to enable those APIs for your cloud project and then also add then also make sure the `API Key` also has access (e.g. list then in the restrict section of API akey access). This API key should allow access from `localhost` domain access, as well as your deployment domain. More generic details are at https://developers.google.com/workspace/guides/create-credentials#api-key

## Recommended editor setup

This code is being developed using [Visual Studio Code](https://code.visualstudio.com/). Make sure to install the angular extension.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `npm run test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page. This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.7; it was then updated to Angular 17.

