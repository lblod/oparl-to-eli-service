# oparl-to-eli-service

Microservice that exposes an [OParl endpoint](https://oparl.org/spezifikation/online-ansicht/) as an HTTP-API supporting following routes:

* `/oparl`: enriches the OParl response with JSON-LD context and lblod:linkToPublication links
* `/eli`: converts the JSON-LD OParl response to ELI(-DL) in text/turtle format

# Usage

## Examples

### 1. Retrieve JSON-LD (enriched OParl response)

```
   curl http://localhost:8080/oparl/oparl/System
```

This will send a request to `https://ris.freiburg.de/oparl/System` and enrich with JSON-LD context.
Also, some of the navigation links will be added as lblod:linkToPublications.

### 2. Retrieve ELI-DL (converted OParl response)

```
   curl http://localhost:8888/eli/oparl/body/FR/paper
```

This will use the JSON-LD response from `http://localhost:8888/eli/oparl/body/FR/paper` and convert it to ELI-DL according to the SPARQL Construct mappings described in `constants.ts`.

## Docker-compose
Add the following snippet in your docker-compose.yml:

  oparl-to-eli:
    image: lblod/oparl-to-eli-service

## Environment variables

* `OPARL_ENDPOINT`: for example https://ris.freiburg.de/oparl

## Health check

The service exposes an endpoint `/status` that you can GET to. 

## Pro-tips

* Installing Comunica (@comunica/query-sparql) with mu-javascript-template (v1.9.1) gave a type error with LRU cache. To fix this, we added "lru-cache": "^11.0.0" in our package.json.