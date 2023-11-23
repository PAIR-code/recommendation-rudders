# README

## CURL tickling of the server

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
