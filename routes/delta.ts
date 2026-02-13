import express, { Request, Response } from 'express';
import { STATUS_SCHEDULED } from '../constants';
import { Delta } from '../lib/delta';
import { run } from '../lib/pipeline';

const router = express.Router();

router.post('/*', async function (req: Request, res: Response, next) {
  try {
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
      run(entry);
    }
    res.status(200).send();
    return;
  } catch (e) {
    console.log(
      'Something unexpected went wrong while handling delta harvesting-tasks!',
    );
    console.error(e);
    if (e instanceof Error) {
      res.status(500).json({ error: e.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
});

export default router;
