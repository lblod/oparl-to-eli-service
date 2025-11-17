import {
  sparqlEscapeUri,
  sparqlEscapeString,
  sparqlEscapeDateTime,
  uuid,
} from 'mu';
import { v4 as uuidv4 } from 'uuid';

import { querySudo as query, updateSudo as update } from '@lblod/mu-auth-sudo';
import {
  TASK_TYPE,
  PREFIXES,
  STATUS_BUSY,
  STATUS_FAILED,
  ERROR_URI_PREFIX,
  TASK_HARVESTING_OPARL,
  ERROR_TYPE,
  MU_SPARQL_ENDPOINT,
  TASK_URI_PREFIX,
  CONTAINER_URI_PREFIX,
  HARVEST_COLLECTION_URI_PREFIX,
  REMOTE_DATA_OBJECT_URI_PREFIX,
  JOB_URI_PREFIX,
  OPARL_TO_ELI_SERVICE_URI,
  JOB_HARVESTING_OPARL,
  STATUS_SCHEDULED,
} from '../constants';
import { convertPrefixesObjectToSPARQLPrefixes, parseResult } from './utils';
const connectionOptions = {
  sparqlEndpoint: MU_SPARQL_ENDPOINT,
  mayRetry: true,
};
export async function failBusyImportTasks() {
  const queryStr = `
      ${convertPrefixesObjectToSPARQLPrefixes(PREFIXES)}
      DELETE {
        GRAPH ?g {
          ?task adms:status ${sparqlEscapeUri(STATUS_BUSY)} .
          ?task dct:modified ?modified.
        }
      }
      INSERT {
        GRAPH ?g {
         ?task adms:status ${sparqlEscapeUri(STATUS_FAILED)} .
         ?task dct:modified ${sparqlEscapeDateTime(new Date())}.
        }
      }
      WHERE {
        GRAPH ?g {
          ?task a ${sparqlEscapeUri(TASK_TYPE)};
                adms:status ${sparqlEscapeUri(STATUS_BUSY)};
                task:operation ?operation.
          VALUES ?operation {
            ${sparqlEscapeUri(TASK_HARVESTING_OPARL)}
          }
          OPTIONAL { ?task dct:modified ?modified. }
        }
      }
     `;
  try {
    await update(queryStr, {}, { mayRetry: true });
  } catch (e) {
    console.warn(
      'WARNING: failed to move busy tasks to failed status on startup.',
      e,
    );
  }
}

export async function isTask(subject) {
  const queryStr = `
     ${convertPrefixesObjectToSPARQLPrefixes(PREFIXES)}
     SELECT ?subject WHERE {
      GRAPH ?g {
        BIND(${sparqlEscapeUri(subject)} as ?subject)
        ?subject a ${sparqlEscapeUri(TASK_TYPE)}.
      }
     }
     LIMIT 1
    `;
  const result = await query(queryStr);
  return result.results.bindings.length;
}

export async function loadCollectingTask(subject) {
  const queryTask = `
     ${convertPrefixesObjectToSPARQLPrefixes(PREFIXES)}
     SELECT DISTINCT ?graph ?task ?id ?job ?created ?modified ?status ?index ?operation ?error ?url WHERE {
      GRAPH ?graph {
        BIND(${sparqlEscapeUri(subject)} as ?task)
        ?task a ${sparqlEscapeUri(TASK_TYPE)}.
        ?task dct:isPartOf ?job;
                      mu:uuid ?id;
                      dct:created ?created;
                      dct:modified ?modified;
                      adms:status ?status;
                      task:index ?index;
                      task:operation ?operation.
          VALUES ?operation {
            ${sparqlEscapeUri(TASK_HARVESTING_OPARL)}
          }
        
        ?task task:inputContainer ?inputContainer .
        ?inputContainer task:hasHarvestingCollection ?harvestCollection .
        ?harvestCollection a harvesting:HarvestingCollection .
        ?harvestCollection dct:hasPart ?rdo .
        ?rdo a nfo:RemoteDataObject;
            nie:url ?url.
        
        OPTIONAL { ?task task:error ?error. }
      }
     }
    `;
  const task = parseResult(await query(queryTask, {}, { mayRetry: true }))[0];
  if (!task) return null;
  return task;
}

export async function updateTaskStatus(task, status) {
  await update(
    `
      ${convertPrefixesObjectToSPARQLPrefixes(PREFIXES)}
      DELETE {
        GRAPH ?g {
          ?subject adms:status ?status .
          ?subject dct:modified ?modified.
        }
      }
      INSERT {
        GRAPH ?g {
         ?subject adms:status ${sparqlEscapeUri(status)}.
         ?subject dct:modified ${sparqlEscapeDateTime(new Date())}.
        }
      }
      WHERE {
        GRAPH ?g {
          BIND(${sparqlEscapeUri(task.task)} as ?subject)
          ?subject adms:status ?status .
          OPTIONAL { ?subject dct:modified ?modified. }
        }
      }
    `,
    {},
    { mayRetry: true },
  );
}

export async function appendTaskError(task, errorMsg) {
  const id = uuid();
  const uri = ERROR_URI_PREFIX + id;

  const queryError = `
      ${convertPrefixesObjectToSPARQLPrefixes(PREFIXES)}
     INSERT DATA {
      GRAPH ${sparqlEscapeUri(task.graph)}{
        ${sparqlEscapeUri(uri)} a ${sparqlEscapeUri(ERROR_TYPE)};
          mu:uuid ${sparqlEscapeString(id)};
          oslc:message ${sparqlEscapeString(errorMsg)}.
        ${sparqlEscapeUri(task.task)} task:error ${sparqlEscapeUri(uri)}.
      }
     }
    `;

  await update(queryError, {}, { mayRetry: true });
}

export async function createTask(
  graph,
  index,
  operation,
  status,
  urlToHarvest,
) {
  const taskId = uuidv4();
  const taskUri = TASK_URI_PREFIX + taskId;
  const created = new Date();

  const jobId = uuidv4();
  const jobUri = JOB_URI_PREFIX + jobId;

  const inputContainerId = uuidv4();
  const inputContainerUri = CONTAINER_URI_PREFIX + inputContainerId;

  const harvestCollectionId = uuidv4();
  const harvestCollectionUri =
    HARVEST_COLLECTION_URI_PREFIX + harvestCollectionId;

  const remoteDataObjectId = uuidv4();
  const remoteDataObjectUri =
    REMOTE_DATA_OBJECT_URI_PREFIX + remoteDataObjectId;

  const jobTriples = `
        ${sparqlEscapeUri(jobUri)} a cogs:Job;
          mu:uuid ${sparqlEscapeString(jobId)} ;
          dct:creator ${sparqlEscapeUri(OPARL_TO_ELI_SERVICE_URI)} ;
          adms:status ${sparqlEscapeUri(STATUS_BUSY)} ;
          dct:created ${sparqlEscapeDateTime(created)};
          dct:modified ${sparqlEscapeDateTime(created)} ;
          task:operation ${sparqlEscapeUri(JOB_HARVESTING_OPARL)} .
  `;
  const inputContainerTriples = `
    ${sparqlEscapeUri(inputContainerUri)} a nfo:DataContainer ;
        task:hasHarvestingCollection ${sparqlEscapeUri(harvestCollectionUri)} ;
        mu:uuid ${sparqlEscapeString(inputContainerId)} .

    ${sparqlEscapeUri(harvestCollectionUri)} a harvesting:HarvestingCollection ;
        mu:uuid ${sparqlEscapeString(harvestCollectionId)} ;
        dct:hasPart ${sparqlEscapeUri(remoteDataObjectUri)} .
    
    
    ${sparqlEscapeUri(remoteDataObjectUri)} a nfo:RemoteDataObject ;
        mu:uuid ${sparqlEscapeString(remoteDataObjectId)} ;
        nie:url ${sparqlEscapeString(urlToHarvest)} .
  `;

  const insertQuery = `
    ${convertPrefixesObjectToSPARQLPrefixes(PREFIXES)}
    INSERT DATA {
      GRAPH ${sparqlEscapeUri(graph)} {
       ${sparqlEscapeUri(taskUri)} a ${sparqlEscapeUri(TASK_TYPE)};
                mu:uuid ${sparqlEscapeString(taskId)};
                dct:isPartOf ${sparqlEscapeUri(jobUri)};
                dct:created ${sparqlEscapeDateTime(created)};
                dct:modified ${sparqlEscapeDateTime(created)};
                adms:status ${sparqlEscapeUri(status)};
                task:index ${sparqlEscapeString(index)};
                task:operation ${sparqlEscapeUri(operation)};
                task:inputContainer ${sparqlEscapeUri(inputContainerUri)} .

        ${inputContainerTriples}

        ${jobTriples}
      }
    }
  `;

  await update(insertQuery);

  return;
}

export async function createJob(graph, urlToHarvest) {
  const created = new Date();
  const jobId = uuidv4();
  const jobUri = JOB_URI_PREFIX + jobId;

  const remoteDataObjectId = uuidv4();
  const remoteDataObjectUri =
    REMOTE_DATA_OBJECT_URI_PREFIX + remoteDataObjectId;

  const jobTriples = `
        ${sparqlEscapeUri(jobUri)} a cogs:Job;
          mu:uuid ${sparqlEscapeString(jobId)} ;
          dct:creator ${sparqlEscapeUri(OPARL_TO_ELI_SERVICE_URI)} ;
          adms:status ${sparqlEscapeUri(STATUS_SCHEDULED)} ;
          dct:created ${sparqlEscapeDateTime(created)};
          dct:modified ${sparqlEscapeDateTime(created)} ;
          nie:url  ${sparqlEscapeUri(remoteDataObjectUri)} ;
          task:operation ${sparqlEscapeUri(JOB_HARVESTING_OPARL)} .

        ${sparqlEscapeUri(remoteDataObjectUri)} a nfo:RemoteDataObject ;
          mu:uuid ${sparqlEscapeString(remoteDataObjectId)} ;
          nie:url ${sparqlEscapeString(urlToHarvest)} .
  `;

  const insertQuery = `
    ${convertPrefixesObjectToSPARQLPrefixes(PREFIXES)}
    INSERT DATA {
      GRAPH ${sparqlEscapeUri(graph)} {
        ${jobTriples}
      }
    }
  `;

  await update(insertQuery);

  return;
}

export async function appendTaskResultFile(task, container, fileUri) {
  const queryStr = `
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
    PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    INSERT DATA {
      GRAPH ${sparqlEscapeUri(task.graph)} {
        ${sparqlEscapeUri(container.uri)} a nfo:DataContainer.
        ${sparqlEscapeUri(container.uri)} mu:uuid ${sparqlEscapeString(container.id)}.
        ${sparqlEscapeUri(container.uri)} task:hasFile ${sparqlEscapeUri(fileUri)}.
        ${sparqlEscapeUri(task.task)} task:resultsContainer ${sparqlEscapeUri(container.uri)}.
      }
    }
  `;

  await update(queryStr, {}, connectionOptions);
}

export async function appendTaskResultGraph(task, container, graphUri) {
  const queryStr = `
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
    PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    INSERT DATA {
      GRAPH ${sparqlEscapeUri(task.graph)} {
        ${sparqlEscapeUri(container.uri)} a nfo:DataContainer.
        ${sparqlEscapeUri(container.uri)} mu:uuid ${sparqlEscapeString(container.id)}.
        ${sparqlEscapeUri(container.uri)} task:hasGraph ${sparqlEscapeUri(graphUri)}.
        ${sparqlEscapeUri(task.task)} task:resultsContainer ${sparqlEscapeUri(container.uri)}.
      }
    }
  `;

  await update(queryStr, {}, connectionOptions);
}
