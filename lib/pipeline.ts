import { uuid } from 'mu';
import { STATUS_BUSY, STATUS_SUCCESS, STATUS_FAILED, STATUS_SCHEDULED, CONTAINER_URI_PREFIX, TASK_HARVESTING_OPARL } from '../constants';
import { loadCollectingTask, updateTaskStatus, appendTaskError, appendTaskResultFile, createTask} from './task';
import { extractLinkToPublications, getEliData } from './utils';
import {
  writeFileToTriplestore,
} from './file-helpers';

export async function run(taskUri) {
  try {
    const task = await loadCollectingTask(taskUri);
    if (!task) return;

    await updateTaskStatus(task, STATUS_BUSY);

    // Get ELI response from OParl URL in the task
    const convertedOparlData = await getEliData(
      task.url,
      'text/turtle',
      task.url,
    );

    // Write ELI to file
    const fileContainer = { id: uuid() };
    fileContainer.uri = `${CONTAINER_URI_PREFIX}${fileContainer.id}`;
    const validFile = await writeFileToTriplestore(
      task.graph,
      convertedOparlData,
      `${fileContainer.id}.ttl`,
      task.url,
      task.jobId,
    );
    await appendTaskResultFile(task, fileContainer, validFile);

    // extract linkToPublications and create new task for each link
    const linkToPublications = await extractLinkToPublications(convertedOparlData);
    console.log(`Extracted ${linkToPublications.length} linkToPublication(s) from OParl ${task.url}`);
    for (const linkToPublication of linkToPublications) {
      console.log(`Creating new task for ${linkToPublication}`);
      await createTask(
        task.graph,
        task.index.toString(),
        TASK_HARVESTING_OPARL,
        STATUS_SCHEDULED,
        linkToPublication,
      );
    }

    await updateTaskStatus(task, STATUS_SUCCESS);
  } catch (e) {
    console.error(e);
    if (task) {
      await appendTaskError(task, e.message);
      await updateTaskStatus(task, STATUS_FAILED);
    }
  }
}