import { uuid } from 'mu';
import { STATUS_BUSY, STATUS_SUCCESS, STATUS_FAILED, WRITE_TO_GRAPH, MU_SPARQL_ENDPOINT } from '../constants';
import {
  loadCollectingTask,
  updateTaskStatus,
  appendTaskError,
  appendTaskResultFile,
  appendTaskResultGraph,
  appendResultGraphFile,
  getInitialRemoteDataObject,
  getHarvestCollectionForTask,
  ensureRemoteDataObjectWithUrl,
} from './task';
import { extractLinkToPublications, getEliData } from './utils';
import { writeFileToTriplestore } from './file-helpers';
import { enqueuePipeline } from './queue';
import PQueue from 'p-queue';
import { insertFromStringIntoGraph } from './super-utils';

export async function run(taskSubject) {
  const task = await loadCollectingTask(taskSubject);
  if (!task) return;

  try {
    await updateTaskStatus(task, STATUS_BUSY);

    const collection = await getHarvestCollectionForTask(taskSubject);
    const rdo = await getInitialRemoteDataObject(collection.collection);

    // We create a specific process queue per task to control the load on the associated OParl API
    const taskSpecificQueue = new PQueue({
      concurrency: 3, // control parallelism
      intervalCap: 10, // rate limit on 10 requests per second
      interval: 1000,
    });

    await enqueuePipeline(task, rdo.url, taskSpecificQueue);

    await taskSpecificQueue.onIdle();

    await updateTaskStatus(task, STATUS_SUCCESS);
  } catch (e) {
    console.error(e);
    await appendTaskError(task, e.message);
    await updateTaskStatus(task, STATUS_FAILED);
  }
}

export async function process(task, url, taskSpecificQueue: PQueue) {
  const collection = await getHarvestCollectionForTask(task.task);

  const graphContainer = { id: uuid() };
  const resultContainer = `http://redpencil.data.gift/id/result-containers/oparl-landingzone/${uuid()}`;
  graphContainer.uri = `http://redpencil.data.gift/id/dataContainers/${graphContainer.id}`;
  const fileContainer = { id: uuid() };
  fileContainer.uri = `http://redpencil.data.gift/id/dataContainers/${fileContainer.id}`;

  // Get ELI response from OParl URL
  // Must be n-triples format, because diff service and mu-auth expect this
  const convertedOparlData = await getEliData(
    url,
    'application/n-triples',
    url,
  );

  // Extract linkToPublications, create Remote Data Objects and add to processing queue
  const linkToPublications =
    await extractLinkToPublications(convertedOparlData);
  console.log(
    `Extracted ${linkToPublications.length} linkToPublication(s) from OParl ${url}`,
  );
  for (const linkToPublication of linkToPublications) {
    console.log(`Adding ${linkToPublication} to queue`);
    await ensureRemoteDataObjectWithUrl(collection, linkToPublication);
    // Don't await, let the queue handle the concurrency
    taskSpecificQueue.add(() =>
      process(task, linkToPublication, taskSpecificQueue),
    );
  }

  // Only write ELI data if no linkToPublications were found
  // No linkToPublications means the response is a subject page (leaf node) with ELI data and we can diff on in a next task
  // If the page has linkToPublications, then this is a paginated page and we expect this to not be idempotent
  if (linkToPublications.length === 0) {
    const fileResult = await writeFileToTriplestore(
      task.graph,
      convertedOparlData,
      `${fileContainer.id}.nt`,
      url,
      task.job,
    );
    await appendTaskResultFile(task, fileContainer, fileResult); // for debugging purpose in dashboard
    await appendResultGraphFile(task, resultContainer, fileResult);

    // Write triples to landing zone graph
    if (WRITE_TO_GRAPH != '') {
      await insertFromStringIntoGraph(
        convertedOparlData,
        'application/n-triples',
        MU_SPARQL_ENDPOINT,
        WRITE_TO_GRAPH,
      );
    }

    await appendTaskResultGraph(task, graphContainer, resultContainer);
  }
}
