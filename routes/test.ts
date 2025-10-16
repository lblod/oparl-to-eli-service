import express, { Request, Response } from 'express';

import { OPARL_ENDPOINT } from '../config';
import {
  MU_APPLICATION_GRAPH,
  STATUS_SCHEDULED,
  TASK_HARVESTING_OPARL,
} from '../constants';
import { createTask } from '../lib/task';

const router = express.Router();

router.post('/*', async (req, res) => {
  try {
    await createTask(
      MU_APPLICATION_GRAPH,
      '1',
      TASK_HARVESTING_OPARL,
      STATUS_SCHEDULED,
      OPARL_ENDPOINT,
    );
    res.status(200).json({
      message: `Test Oparl harvesting task created to Oparl endpoint: ${OPARL_ENDPOINT}`,
    });
  } catch (err) {
    console.error('Error creating harvesting task:', err);
    res.status(500).json({ error: 'Failed to start scraping' });
  }
});

export default router;
