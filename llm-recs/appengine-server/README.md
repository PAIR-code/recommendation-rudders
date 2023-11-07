# README

# Setup

1. This application is for running in AppEngine in a Google Cloud Project. You can create one at https://console.cloud.google.com/ This runs on needs to have billing enabled, which you can do at: https://console.cloud.google.com/billing

1. Enable the Vertex AI Platform APIs. You can do this with the command:

```sh
gcloud services enable aiplatform.googleapis.com
```

1. You need to create, or have an existing AppEngine setup for your cloud project too. It can be enabled in the web UI at https://console.cloud.google.com/appengine/start/create This will happen when you first deploy also, but it has to be setup before you can give permissions in the next step.

1. The AppEngine service account needs to have permission to make prediction requests. You can give this permission using:

```sh
gcloud iam service-accounts add-iam-policy-binding \
    ${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com \
    --member=${SERVICE_ACCOUNT_NAME}@appspot.gserviceaccount.com \
    --role=serviceAccount:roles/aiplatform.user
```

Note: this gives a little more than just the strict prediction ability. You can make a custom role if you want it to be more constrained. But in practice, something like this will be convenient for extending to add other kinds of AI Platform features.

This application uses the App Engine standard environment in nodejs. More about that is at: https://cloud.google.com/appengine/docs/standard/nodejs/runtime

## CURL tickling of the server to get an embedding

```sh
curl \
-X POST \
-H "Content-Type: application/json" \
http://localhost:8080/api/embed \
-d $'{ "text": "I love flowers" }'
```

## Running and developing locally

```sh
npm run start
```

## Automated Tests

```sh
npm run test
```

## Building

```sh
npm run build-static
```

## Deploying

Deploy to production appengine environment. Remember to first set your cloud
project so you don't deploy to the wrong one. e.g.

```sh
gcloud config set project ${YOUR_CLOUD_PROJECT}
```

And then you can deploy using:

```sh
gcloud app deploy app.yaml
```

Note: files specified in `.gcloudignore` are ignored, and not uploaded.

You can then view the live site online with:

```sh
gcloud app browse
```

### Seeing the logs of the deployed version in AppEngine

See the `default` service's recorded logs (via appengine):

```sh
gcloud app logs tail -s default
```

Note: this can be a bit slow to start.

To see AppEngine's system logs in web UI go to:
https://console.developers.google.com/appengine/services
And look at the service entry for this application (by default it is the
"default" service) and click on logs button at the far right to see this
service's logs.
