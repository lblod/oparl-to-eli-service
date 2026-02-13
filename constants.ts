import env from 'env-var';
import { convertPrefixesObjectToSPARQLPrefixes } from './lib/utils';

export const OPARL_TO_ELI_SERVICE_URI =
  'http://lblod.data.gift/services/oparl-to-eli-service';
export const LINK_TO_PUBLICATION_PREDICATE =
  'http://lblod.data.gift/vocabularies/besluit/linkToPublication';

export const TASK_HARVESTING_OPARL =
  'http://lblod.data.gift/id/jobs/concept/TaskOperation/harvesting/oparl';
export const TASK_SINGLETON =
  'http://lblod.data.gift/id/jobs/concept/TaskOperation/singleton-job';
export const JOB_HARVESTING_OPARL =
  'http://lblod.data.gift/id/jobs/concept/JobOperation/harvesting/oparl';

export const TASK_URI_PREFIX = 'http://lblod.data.gift/id/task/';
export const JOB_URI_PREFIX = 'http://lblod.data.gift/id/job/';
export const CONTAINER_URI_PREFIX = 'http://lblod.data.gift/id/dataContainers/';
export const HARVEST_COLLECTION_URI_PREFIX =
  'http://lblod.data.gift/id/harvest-collections/';
export const REMOTE_DATA_OBJECT_URI_PREFIX =
  'http://lblod.data.gift/id/remote-data-objects/';

export const STATUS_BUSY =
  'http://redpencil.data.gift/id/concept/JobStatus/busy';
export const STATUS_SCHEDULED =
  'http://redpencil.data.gift/id/concept/JobStatus/scheduled';
export const STATUS_SUCCESS =
  'http://redpencil.data.gift/id/concept/JobStatus/success';
export const STATUS_FAILED =
  'http://redpencil.data.gift/id/concept/JobStatus/failed';

export const FILE_STATUSES = {
  READY: 'http://lblod.data.gift/file-download-statuses/ready-to-be-cached',
  ONGOING: 'http://lblod.data.gift/file-download-statuses/ongoing',
  COLLECTED: 'http://lblod.data.gift/file-download-statuses/collected',
  FAILURE: 'http://lblod.data.gift/file-download-statuses/failure',
};

export const JOB_TYPE = 'http://vocab.deri.ie/cogs#Job';
export const TASK_TYPE = 'http://redpencil.data.gift/vocabularies/tasks/Task';
export const ERROR_TYPE = 'http://open-services.net/ns/core#Error';
export const ERROR_URI_PREFIX = 'http://redpencil.data.gift/id/jobs/error/';

export const MU_SPARQL_ENDPOINT = env
  .get('MU_SPARQL_ENDPOINT')
  .default('http://database:8890/sparql')
  .asString();
export const TARGET_GRAPH = env
  .get('TARGET_GRAPH')
  .default('http://mu.semte.ch/graphs/harvesting')
  .asString();
export const STRING_LIMIT = env
  .get('STRING_LIMIT')
  .default('5000')
  .asIntPositive();
export const WRITE_TO_GRAPH = env.get('WRITE_TO_GRAPH').default('').asString();

export const PREFIXES = {
  harvesting: 'http://lblod.data.gift/vocabularies/harvesting/',
  terms: 'http://purl.org/dc/terms/',
  dcterms: 'http://purl.org/dc/terms/',
  prov: 'http://www.w3.org/ns/prov#',
  nie: 'http://www.semanticdesktop.org/ontologies/2007/01/19/nie#',
  ext: 'http://mu.semte.ch/vocabularies/ext/',
  mu: 'http://mu.semte.ch/vocabularies/core/',
  task: 'http://redpencil.data.gift/vocabularies/tasks/',
  dct: 'http://purl.org/dc/terms/',
  oslc: 'http://open-services.net/ns/core#',
  cogs: 'http://vocab.deri.ie/cogs#',
  adms: 'http://www.w3.org/ns/adms#',
  nfo: 'http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#',
  dbpedia: 'http://dbpedia.org/ontology/',
  eli: 'http://data.europa.eu/eli/ontology#',
  'eli-dl': 'http://data.europa.eu/eli/eli-draft-legislation-ontology#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  oparl: 'https://schema.oparl.org/',
  epvoc: 'https://data.europarl.europa.eu/def/epvoc#',
  foaf: 'http://xmlns.com/foaf/0.1/',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
};

export const PREFIXES_SPARQL = convertPrefixesObjectToSPARQLPrefixes(PREFIXES);

export const OPARL_JSON_LD_CONTEXT = {
  '@context': {
    '@vocab': 'https://schema.oparl.org/',
    'more-it-solutions': 'http://more-it-solutions.de/',
    'more-software-gmbh': 'http://more-software-gmbh.de/',
    id: '@id',
    type: '@type',
    data: '@included',
    links: '@included',
    lblod: 'http://lblod.data.gift/vocabularies/besluit/',
    tree: 'https://w3id.org/tree#',
    Node: {
      '@id': 'tree:Node',
      '@type': '@id',
      '@context': {
        linkToPublication: {
          '@id': LINK_TO_PUBLICATION_PREDICATE,
          '@type': '@id',
        },
        next: 'linkToPublication',
        body: 'linkToPublication',
        organization: 'linkToPublication',
        meeting: 'linkToPublication',
        person: 'linkToPublication',
        paper: 'linkToPublication',
        consultation: 'linkToPublication',
        subject: 'linkToPublication',
      },
    },
    pagination: null,
    first: null,
    last: null,
    self: null,
  },
};

export const SPARQL_CONSTRUCTS = [
  {
    name: 'Paper',
    query: `${PREFIXES_SPARQL}
            CONSTRUCT {
              ?paper a eli:Work ;
                      dcterms:title ?titleLang ;
                      dcterms:identifier ?identifier ;
                      eli:date_document ?date ;
                      eli:work_type ?paperTypeConcept ;
                      eli:is_realized_by ?mainFileExpression ;
                      eli:related_to ?auxFile ;
                      dcterms:creator ?creator ;
                      dcterms:contributor ?contributor .
            }
            WHERE {
              ?paper a oparl:Paper ;
                      oparl:name ?title ;
                      oparl:reference ?identifier ;
                      oparl:date ?dateRaw ;
                      oparl:paperType ?paperType .
              BIND(xsd:date(?dateRaw) AS ?date)
              BIND(IRI(CONCAT("http://data.lblod.info/id/concept/decision-type/", UCASE(REPLACE(STR(?paperType), " ", "-")))) AS ?paperTypeConcept)
              OPTIONAL { 
                ?paper oparl:mainFile ?mainFile . 
                BIND(IRI(CONCAT(STR(?mainFile), "/expression/de")) AS ?mainFileExpression)
              }
              OPTIONAL { ?paper oparl:auxiliaryFile ?auxFile . }
              OPTIONAL { 
                ?paper oparl:originatorPerson|oparl:originatorOrganization ?creator .
              }
              OPTIONAL { ?paper oparl:underDirectionOf ?contributor . }
              BIND(STRLANG(?title, "de") AS ?titleLang)
            }`,
  },
  {
    name: 'File (Main)',
    query: `${PREFIXES_SPARQL}
              CONSTRUCT {                
                ?expression a eli:Expression ;
                  eli:title ?titleLang ;
                  eli:language <http://publications.europa.eu/resource/authority/language/DEU> ;
                  epvoc:expressionContent ?textLang ;
                  eli:is_embodied_by ?manifestation .

                ?manifestation a eli:Manifestation ;
                  eli:media_type ?mimeType ;
                  epvoc:byteSize ?size ;
                  dcterms:issued ?issuedDate ;
                  eli:is_exemplified_by ?accessUrl .
              }
              WHERE {
                ?paper oparl:mainFile ?manifestation .

                ?manifestation a oparl:File ;
                    oparl:name ?name ;
                    oparl:mimeType ?mimeType ;
                    oparl:size ?size ;
                    oparl:text ?text ;
                    oparl:accessUrl ?accessUrl .

                # Create derived IRIs and typed/language-tagged literals
                BIND(IRI(CONCAT(STR(?manifestation), "/expression/de")) AS ?expression)
                BIND(STRLANG(?name, "de") AS ?titleLang)
                BIND(STRLANG(?text, "de") AS ?textLang)
              }`,
  },
  {
    name: 'File (Auxiliary)',
    query: `${PREFIXES_SPARQL}
              CONSTRUCT {
                ?document a foaf:Document ;
                  eli:media_type ?mimeType ;
                  epvoc:byteSize ?size ;
                  dcterms:issued ?issuedDate ;
                  rdfs:seeAlso ?accessUrl .
              }
              WHERE {
                ?paper oparl:auxiliaryFile ?document .

                ?document a oparl:File ;
                    oparl:name ?name ;
                    oparl:mimeType ?mimeType ;
                    oparl:size ?size ;
                    oparl:created ?created ;
                    oparl:modified ?modified ;
                    oparl:text ?text ;
                    oparl:accessUrl ?accessUrl .
                
                # Create typed/language-tagged literals
                BIND(STRLANG(?name, "de") AS ?titleLang)
                BIND(STRLANG(?text, "de") AS ?textLang)
                BIND(xsd:date(?date) AS ?issuedDate)
              }`,
  },
  {
    name: 'Consultation',
    query: `${PREFIXES_SPARQL}
              CONSTRUCT {
                ?consultation a eli-dl:Activity ;
                  eli-dl:based_on_a_realization_of ?paper ;
                  eli-dl:executed ?agendaItem ;
                  oparl:authoritative ?authoritative ;
                  oparl:role ?role .
              }
              WHERE {
                ?paper a oparl:Paper ;
                        oparl:consultation ?consultation .

                ?consultation a oparl:Consultation ;
                        oparl:agendaItem ?agendaItem ;
                        oparl:authoritative ?authoritative ;
                        oparl:role ?role .
              }`,
  },
  {
    name: 'others',
    query: `${PREFIXES_SPARQL}
              CONSTRUCT {
                ?s ?p ?o .
              }
              WHERE {
                ?s a ?type .
                ?s ?p ?o .
                
                FILTER (?type NOT IN (oparl:Paper, oparl:File, oparl:Consultation))
                FILTER(!isBlank(?s) && !isBlank(?p) && !isBlank(?o))
              }`,
  },
];
