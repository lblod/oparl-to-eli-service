import express, { Request, Response } from 'express';

import { OPARL_ENDPOINT } from '../config';

import { enrichOparlDataToJsonLd, getOparlData } from '../lib/utils';

const router = express.Router();

router.get('/*', async (req: Request, res: Response) => {
  console.log('Received request:', req.params);
  try {
    const oparlUrl = `${OPARL_ENDPOINT}${req.path.substring(req.path.indexOf('/oparl') + 6)}`;
    let oparlData = await getOparlData(oparlUrl);
    oparlData = enrichOparlDataToJsonLd(oparlData, req);

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
