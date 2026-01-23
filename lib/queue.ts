import PQueue from 'p-queue';
import { process } from './pipeline';

// Incoming tasks (via Delta) are queued here
const taskQueue = new PQueue({
  concurrency: 1, // control parallelism
  intervalCap: 100, // optional rate limit
  interval: 1000,
});

export async function enqueuePipeline(
  task,
  url: string,
  taskSpecificQueue: PQueue,
) {
  return taskQueue.add(() => process(task, url, taskSpecificQueue));
}
