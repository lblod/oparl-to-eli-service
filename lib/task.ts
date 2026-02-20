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
  STATUS_BUSY,
  STATUS_FAILED,
  ERROR_URI_PREFIX,
  TASK_HARVESTING_OPARL,
  ERROR_TYPE,
  MU_SPARQL_ENDPOINT,
  REMOTE_DATA_OBJECT_URI_PREFIX,
  PREFIXES_SPARQL,
  TARGET_GRAPH,
  FILE_STATUSES,
  TASK_URI_PREFIX,
  JOB_URI_PREFIX,
  OPARL_TO_ELI_SERVICE_URI,
  JOB_HARVESTING_OPARL,
  JOB_TYPE,
  CONTAINER_URI_PREFIX,
  HARVEST_COLLECTION_URI_PREFIX,
} from '../constants';
import { parseResult } from './utils';
const connectionOptions = {
  sparqlEndpoint: MU_SPARQL_ENDPOINT,
  mayRetry: true,
};
export async function failBusyImportTasks() {
  const queryStr = `
      ${PREFIXES_SPARQL}
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
     ${PREFIXES_SPARQL}
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
     ${PREFIXES_SPARQL}
     SELECT DISTINCT ?graph ?task ?id ?job ?created ?modified ?status ?index ?operation ?error WHERE {
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
        
        OPTIONAL { ?task task:error ?error. }
      }
     }
    `;
  const task = parseResult(await query(queryTask, {}, { mayRetry: true }))[0];
  if (!task) return null;
  return task;
}

export async function getInitialRemoteDataObject(collectionSubject) {
  const queryRdo = `
     ${PREFIXES_SPARQL}
     SELECT DISTINCT ?uri ?uuid ?url WHERE {
      GRAPH ?g {
        BIND(${sparqlEscapeUri(collectionSubject)} as ?collection)
        ?collection a harvesting:HarvestingCollection .
        
        ?collection dct:hasPart ?uri .
        ?uri a nfo:RemoteDataObject;
            mu:uuid ?uuid;
            nie:url ?url.
      }
     }
     LIMIT 1
    `;
  const rdo = parseResult(await query(queryRdo, {}, { mayRetry: true }))[0];
  if (!rdo) return null;
  return rdo;
}

export async function getRemoteDataObjectWithUrl(collectionSubject, url) {
  const queryTask = `
     ${PREFIXES_SPARQL}
     SELECT DISTINCT ?uri ?uuid ?url WHERE {
      GRAPH ?g {
        BIND(${sparqlEscapeUri(collectionSubject)} as ?collection)
        ?collection a harvesting:HarvestingCollection .
        
        ?collection dct:hasPart ?uri .
        ?uri a nfo:RemoteDataObject;
            mu:uuid ?uuid;
            nie:url ${sparqlEscapeUri(url)}.
      }
     }
     LIMIT 1
    `;
  const rdo = parseResult(await query(queryTask, {}, { mayRetry: true }))[0];
  if (!rdo) return null;
  return rdo;
}

export async function getHarvestCollectionForTask(subject) {
  const queryTask = `
     ${PREFIXES_SPARQL}
     SELECT DISTINCT ?graph ?task ?collection WHERE {
      GRAPH ?graph {
        BIND(${sparqlEscapeUri(subject)} as ?task)
        ?task a ${sparqlEscapeUri(TASK_TYPE)}.
        
        ?task task:inputContainer ?inputContainer .
        ?inputContainer task:hasHarvestingCollection ?collection .
        ?collection a harvesting:HarvestingCollection .        
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
      ${PREFIXES_SPARQL}
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
      ${PREFIXES_SPARQL}
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
  jobUri?,
) {
  const taskId = uuidv4();
  const taskUri = TASK_URI_PREFIX + taskId;
  const created = new Date();

  let jobTriples = '';
  if (!jobUri) {
    const jobId = uuidv4();
    jobUri = JOB_URI_PREFIX + jobId;
    jobTriples = `
        ${sparqlEscapeUri(jobUri)} a ${sparqlEscapeUri(JOB_TYPE)} ;
          mu:uuid ${sparqlEscapeString(jobId)} ;
          dct:creator ${sparqlEscapeUri(OPARL_TO_ELI_SERVICE_URI)} ;
          adms:status ${sparqlEscapeUri(STATUS_BUSY)} ;
          dct:created ${sparqlEscapeDateTime(created)};
          dct:modified ${sparqlEscapeDateTime(created)} ;
          task:operation ${sparqlEscapeUri(JOB_HARVESTING_OPARL)} .
  `;
  }

  const inputContainerId = uuidv4();
  const inputContainerUri = CONTAINER_URI_PREFIX + inputContainerId;

  const harvestCollectionId = uuidv4();
  const harvestCollectionUri =
    HARVEST_COLLECTION_URI_PREFIX + harvestCollectionId;

  const remoteDataObjectId = uuidv4();
  const remoteDataObjectUri =
    REMOTE_DATA_OBJECT_URI_PREFIX + remoteDataObjectId;

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
    ${PREFIXES_SPARQL}
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
    ${PREFIXES_SPARQL}
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

// This relation is expected when using import-same-as service (add-uuid)
// import-same-as extracts the file from the `task:hasGraph/task:hasFile` relation (https://github.com/lblod/import-with-sameas-service/blob/master/lib/graph.js#L199C19-L199C82)
export async function appendResultGraphFile(task, graphUri, logicalFile) {
  const queryStr = `
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
    PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    INSERT DATA {
      GRAPH ${sparqlEscapeUri(task.graph)} {
        ${sparqlEscapeUri(graphUri)} task:hasFile ${sparqlEscapeUri(logicalFile)} .
      }
    }
  `;

  await update(queryStr, {}, connectionOptions);
}

export async function ensureRemoteDataObjectWithUrl(collection, url) {
  const rdo = await getRemoteDataObjectWithUrl(
    collection.collection,
    url,
    collection.graph,
  );
  if (rdo) {
    return rdo;
  } else {
    return await createRemoteDataObject(collection, url);
  }
}

export async function createRemoteDataObject(collection, url) {
  const uuid = uuidv4();
  const uri = REMOTE_DATA_OBJECT_URI_PREFIX + uuid;
  const created = new Date();

  const query = `
    PREFIX    adms: <http://www.w3.org/ns/adms#>
    PREFIX    mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX    nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    PREFIX    dct: <http://purl.org/dc/terms/>
    PREFIX    nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
    PREFIX    nuao: <http://www.semanticdesktop.org/ontologies/2010/01/25/nuao#>

    INSERT DATA {
      GRAPH ${sparqlEscapeUri(TARGET_GRAPH)} {
        ${sparqlEscapeUri(collection.collection)} dct:hasPart ${sparqlEscapeUri(uri)}.
        ${sparqlEscapeUri(uri)} a nfo:RemoteDataObject .
        ${sparqlEscapeUri(uri)}
          mu:uuid ${sparqlEscapeString(uuid)};
          nie:url ${sparqlEscapeUri(url)};
          dct:created ${sparqlEscapeDateTime(created)};
          dct:creator ${sparqlEscapeUri(OPARL_TO_ELI_SERVICE_URI)};
          dct:modified ${sparqlEscapeDateTime(created)};
          adms:status ${sparqlEscapeUri(FILE_STATUSES.READY)}.
      }
    }
    `;

  await update(query, {}, connectionOptions);

  return {
    uuid,
    url,
    uri,
    status: FILE_STATUSES.READY,
  };
}
