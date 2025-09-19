export const OPARL_JSON_LD_CONTEXT = {
  '@context': {
    '@vocab': 'https://schema.oparl.org/',
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
          '@id': 'lblod:linkToPublication',
          '@type': '@id',
        },
        next: 'linkToPublication',
        body: 'linkToPublication',
        organization: 'linkToPublication',
        meeting: 'linkToPublication',
        person: 'linkToPublication',
        paper: 'linkToPublication',
        consultation: 'linkToPublication',
      },
    },
    pagination: null,
    first: null,
    last: null,
    self: null,
  },
};
export const STATUS_BUSY =
  'http://redpencil.data.gift/id/concept/JobStatus/busy';
export const STATUS_SCHEDULED =
  'http://redpencil.data.gift/id/concept/JobStatus/scheduled';
export const STATUS_SUCCESS =
  'http://redpencil.data.gift/id/concept/JobStatus/success';
export const STATUS_FAILED =
  'http://redpencil.data.gift/id/concept/JobStatus/failed';

export const FILE_DOWNLOAD_SUCCESS =
  'http://lblod.data.gift/file-download-statuses/success';
export const FILE_DOWNLOAD_FAILURE =
  'http://lblod.data.gift/file-download-statuses/failure';

export const TASK_TYPE = 'http://redpencil.data.gift/vocabularies/tasks/Task';
export const ERROR_TYPE = 'http://open-services.net/ns/core#Error';

export const ERROR_URI_PREFIX = 'http://redpencil.data.gift/id/jobs/error/';

export const BASIC_AUTH =
  'https://www.w3.org/2019/wot/security#BasicSecurityScheme';
export const OAUTH2 =
  'https://www.w3.org/2019/wot/security#OAuth2SecurityScheme';

export const PREFIXES = `
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
  PREFIX meb: <http://rdf.myexperiment.org/ontologies/base/>
  PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX prov: <http://www.w3.org/ns/prov#>
  PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX oslc: <http://open-services.net/ns/core#>
  PREFIX cogs: <http://vocab.deri.ie/cogs#>
  PREFIX adms: <http://www.w3.org/ns/adms#>
  PREFIX hrvst: <http://lblod.data.gift/vocabularies/harvesting/>
  PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
  PREFIX dgftSec: <http://lblod.data.gift/vocabularies/security/>
  PREFIX dgftOauth: <http://kanselarij.vo.data.gift/vocabularies/oauth-2.0-session/>
  PREFIX wotSec: <https://www.w3.org/2019/wot/security#>
  PREFIX rpioHttp: <http://redpencil.data.gift/vocabularies/http/>
  PREFIX http: <http://www.w3.org/2011/http#>
`;

export const STATUS_READY_TO_BE_CACHED =
  'http://lblod.data.gift/file-download-statuses/ready-to-be-cached';

export const TASK_COLLECTING =
  'http://lblod.data.gift/id/jobs/concept/TaskOperation/collecting';
