import express, { Request, Response } from 'express';

import { OPARL_ENDPOINT } from '../config';
import { getOparlData } from '../lib/utils';
import { enrichOparlDataToJsonLd } from '../lib/enrich';

const router = express.Router();

router.get('/*', async (req: Request, res: Response) => {
  console.log('Received request:', req.params);
  try {
    const oparlEndpoint = req.params.oparlEndpoint
      ? req.params.oparlEndpoint
      : OPARL_ENDPOINT;
    const oparlUrl = `${oparlEndpoint}${req.path.substring(req.path.indexOf('/oparl') + 6)}`;
    let oparlData = await getOparlData(oparlUrl);
    const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    oparlData = enrichOparlDataToJsonLd(oparlData, currentUrl);

    res.setHeader('Content-Type', 'application/ld+json');
    res.json(oparlData);
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
});

export default router;
