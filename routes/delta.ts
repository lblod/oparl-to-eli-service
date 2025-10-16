import express, { Request, Response } from 'express';
import { STATUS_SCHEDULED } from '../constants';
import { run as runCollectPipeline } from '../lib/pipeline';
import { Delta } from '../lib/delta';

const router = express.Router();

router.post('/*', async function(req: Request, res: Response)  {
  try {
    console.log("yes");
    const entries = new Delta(req.body).getInsertsFor(
      'http://www.w3.org/ns/adms#status',
      STATUS_SCHEDULED,
    );
    if (!entries.length) {
      console.log(
        'Delta dit not contain potential tasks that are ready for collecting, awaiting the next batch!',
      );
      res.status(204).send();
      return;
    }
    for (const entry of entries) {
      // NOTE: we don't wait as we do not want to keep hold off the connection.
      runCollectPipeline(entry);
    }
    res.status(200).send();
    return;
  } catch (e) {
    console.log(
      'Something unexpected went wrong while handling delta harvesting-tasks!',
    );
    console.error(e);
    return next(e);
  }
});

export default router;