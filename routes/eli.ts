import express, { Request, Response } from 'express';
import { enrichOparlDataToJsonLd, getOparlData } from '../lib/utils';
import { OPARL_ENDPOINT } from '../config';
import { convertOparlToEli } from '../lib/convert';

const router = express.Router();

router.get('/*', async (req: Request, res: Response) => {
  console.log('Received request:', req.params);
  try {
    const oparlUrl = `${OPARL_ENDPOINT}${req.path.substring(req.path.indexOf('/eli') + 7)}`;
    let oparlData = await getOparlData(oparlUrl);
    oparlData = enrichOparlDataToJsonLd(oparlData, req);
    const convertedOparlData = await convertOparlToEli(oparlData);

    res.setHeader('Content-Type', 'text/turtle');
    res.json(convertedOparlData);
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
