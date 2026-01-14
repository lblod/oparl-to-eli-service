import { uuid } from 'mu';
import {
  STATUS_BUSY,
  STATUS_SUCCESS,
  STATUS_FAILED,
  STATUS_SCHEDULED,
  TASK_HARVESTING_OPARL,
  MU_SPARQL_ENDPOINT,
  TARGET_GRAPH,
} from '../constants';
import {
  loadCollectingTask,
  updateTaskStatus,
  appendTaskError,
  appendTaskResultFile,
  appendTaskResultGraph,
  createTask,
  appendResultGraphFile,
} from './task';
import { extractLinkToPublications, getEliData } from './utils';
import { writeFileToTriplestore } from './file-helpers';
import { insertFromStringIntoGraph } from './super-utils';

export async function run(taskUri) {
  const task = await loadCollectingTask(taskUri);
  if (!task) return;

  try {
    await updateTaskStatus(task, STATUS_BUSY);
    const graphContainer = { id: uuid() };
    const resultContainer = `http://redpencil.data.gift/id/result-containers/oparl-landingzone/${uuid()}`;
    graphContainer.uri = `http://redpencil.data.gift/id/dataContainers/${graphContainer.id}`;
    const fileContainer = { id: uuid() };
    fileContainer.uri = `http://redpencil.data.gift/id/dataContainers/${fileContainer.id}`;

    // Get ELI response from OParl URL in the task
    // Must be n-triples, because diff service and mu-auth expect this
    const convertedOparlData = await getEliData(
      task.url,
      'application/n-triples',
      task.url,
    );

    // Write ELI to file
    const fileResult = await writeFileToTriplestore(
      task.graph,
      convertedOparlData,
      `${fileContainer.id}.nt`,
      task.url,
      task.jobId,
    );
    await appendTaskResultFile(task, fileContainer, fileResult); // for debugging purpose in dashboard
    await appendResultGraphFile(task, resultContainer, fileResult);

    await insertFromStringIntoGraph(
      convertedOparlData,
      'application/n-triples',
      MU_SPARQL_ENDPOINT,
      resultContainer,
    );

    // extract linkToPublications and create new task for each link
    const linkToPublications =
      await extractLinkToPublications(convertedOparlData);
    console.log(
      `Extracted ${linkToPublications.length} linkToPublication(s) from OParl ${task.url}`,
    );
    for (const linkToPublication of linkToPublications) {
      console.log(`Creating new task for ${linkToPublication}`);
      await createTask(
        task.graph,
        task.index.toString(),
        TASK_HARVESTING_OPARL,
        STATUS_SCHEDULED,
        linkToPublication,
        task.job,
      );
    }

    await appendTaskResultGraph(task, graphContainer, resultContainer);
    await updateTaskStatus(task, STATUS_SUCCESS);
  } catch (e) {
    console.error(e);
    await appendTaskError(task, e.message);
    await updateTaskStatus(task, STATUS_FAILED);
  }
}
