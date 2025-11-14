# oparl-to-eli-service

Microservice that exposes an Oparl API as a Linked Open Data API and allows to integrate the dataset in a triple store.

First, it exposes an [OParl endpoint](https://oparl.org/spezifikation/online-ansicht/) as an Linked Open Data API supporting following routes:

* `/oparl`: enriches the OParl response with JSON-LD context and lblod:linkToPublication links
* `/eli`: converts the JSON-LD OParl response to ELI(-DL) in text/turtle format

Second, the service reacts to Oparl harvesting Tasks in the triple store. Following steps are done in each task:

* Retrieve Oparl URL provided in the input container of the task
* Call function to fetch Oparl URL (JSON format), enrich towards JSON-LD, and transform to ELI-DL format
* Save ELI-DL in Turtle format in file
* Extract linkToPublication links and create for each discovered link a new Oparl harvesting task (see datamodel below)

# Usage

## Examples

### 1. Retrieve JSON-LD (enriched OParl response)

```
   curl http://localhost/oparl/oparl/System
```

This will send a request to `https://ris.freiburg.de/oparl/System` and enrich with JSON-LD context.
Also, some of the navigation links will be added as lblod:linkToPublications.

### 2. Retrieve ELI-DL (converted OParl response)

```
   curl http://localhost/eli/oparl/body/FR/paper
```

This will use the JSON-LD response from `http://localhost:8888/eli/oparl/body/FR/paper` and convert it to ELI-DL according to the SPARQL Construct mappings described in `constants.ts`.

### 3. Start harvesting Oparl endpoint

Send an HTTP POST request to `/test` to create a harvesting task on the configured `OPARL_ENDPOINT`. This triggers the delta notifier which then starts the pipeline in `lib/pipeline.ts`.

## Docker-compose
Add the following snippet in your docker-compose.yml:

  oparl-to-eli:
    image: lblod/oparl-to-eli-service

## Environment variables

* `OPARL_ENDPOINT`: endpoint to fetch, for example https://ris.freiburg.de/oparl
* `EMBED_JSONLD_CONTEXT`: whether the JSON-LD context should be provided inside the response or just linked. Default 'true'

## Health check

The service exposes an endpoint `/status` that you can GET to. 

## Pro-tips

* Installing Comunica (@comunica/query-sparql) with mu-javascript-template (v1.9.1) gave a type error with LRU cache. To fix this, we added "lru-cache": "^11.0.0" in our package.json.

## linkToPublications

Following navigation links in Oparl are mapped to `lblod:linkToPublication`:

![LinkToPublications in Oparl response](docs/oparlspec-linktopublication.png)
]

## Example harvesting task

The task model described in the [job-controller-service](https://github.com/lblod/job-controller-service/blob/master/README.md) is used. For example:

```
<http://lblod.data.gift/id/task/e1ac2980-aa99-11f0-9253-d7fdf867c511> a <http://redpencil.data.gift/vocabularies/tasks/Task>;
    mu:uuid """e1ac2980-aa99-11f0-9253-d7fdf867c511""";
    dct:isPartOf <http://lblod.data.gift/id/job/e1ac5090-aa99-11f0-9253-d7fdf867c511>;
    dct:created "2025-10-16T14:10:34.137Z"^^xsd:dateTime;
    dct:modified "2025-10-16T14:10:34.137Z"^^xsd:dateTime;
    adms:status <http://redpencil.data.gift/id/concept/JobStatus/scheduled>;
    task:index """1""";
    task:operation <http://lblod.data.gift/id/jobs/concept/TaskOperation/harvesting/oparl>.
    2025-10-16 16:10:34 

<http://lblod.data.gift/id/dataContainers/e1ac5091-aa99-11f0-9253-d7fdf867c511> a nfo:DataContainer ;
    task:hasHarvestingCollection <http://lblod.data.gift/id/harvest-collections/e1ac5092-aa99-11f0-9253-d7fdf867c511> ;
    mu:uuid """e1ac5091-aa99-11f0-9253-d7fdf867c511""" .
    2025-10-16 16:10:34 
    <http://lblod.data.gift/id/harvest-collections/e1ac5092-aa99-11f0-9253-d7fdf867c511> a harvesting:HarvestingCollection ;
    mu:uuid """e1ac5092-aa99-11f0-9253-d7fdf867c511""" ;
    dct:hasPart <http://lblod.data.gift/id/remote-data-objects/e1ac5093-aa99-11f0-9253-d7fdf867c511> .


<http://lblod.data.gift/id/remote-data-objects/e1ac5093-aa99-11f0-9253-d7fdf867c511> a nfo:RemoteDataObject ;
    mu:uuid """e1ac5093-aa99-11f0-9253-d7fdf867c511""" ;
    nie:url """https://ris.freiburg.de/oparl""" .
```

## Test ELI mapping

To test ELI mappings with SPARQL constructs, you can use the [Comunica UI](https://query.comunica.dev/#datasources=http%3A%2F%2Flocalhost%3A8888%2Foparl%2Foparl%2Fbody%2FFR%2Fpaper&query=PREFIX%20example%3A%20%3Chttp%3A%2F%2Fwww.example.org%2Frdf%23%3E%0Aconstruct%20%7B%0A%20%20%3Fs%20a%20example%3AThing%20.%0A%7D%0Awhere%20%7B%0A%20%20%3Fs%20a%20%3Chttps%3A%2F%2Fschema.oparl.org%2FPaper%3E%20.%0A%7D).
The OPARL endpoint in JSON-LD is used as data source to test the ELI mapping.