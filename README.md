# oparl-to-eli-service

Microservice that exposes an [OParl endpoint](https://oparl.org/spezifikation/online-ansicht/) as an HTTP-API supporting following formats:

* application/json (original OParl response)
* text/turtle (converted to ELI)

# Usage

## Examples

### 1. Retrieve JSON (original OParl response) - WIP

```
   curl -H "Accept: application/json" http://localhost:8080/oparl
```

### 2. Retrieve JSON-LD (enriched OParl response)

```
   curl -H "Accept: application/ld+json" http://localhost:8080/oparl
```

## Docker-compose
Add the following snippet in your docker-compose.yml:

  oparl-to-eli:
    image: lblod/oparl-to-eli-service

## Environment variables

* `OPARL_ENDPOINT`: for example https://ris.freiburg.de/oparl

## Testing
the service exposes an endpoint `/system` that you can GET to. 