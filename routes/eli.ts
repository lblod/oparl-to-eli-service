import express, { Request, Response } from 'express';
import { getEliData } from '../lib/utils';
import { OPARL_ENDPOINT } from '../config';

const router = express.Router();

router.get('/*', async (req: Request, res: Response) => {
  console.log('Received request:', req.params);
  try {
    const oparlEndpoint = req.params.oparlEndpoint
      ? req.params.oparlEndpoint
      : OPARL_ENDPOINT;
    const oparlUrl = `${oparlEndpoint}${req.path.substring(req.path.indexOf('/eli') + 7)}`;
    const format =
      req.headers.accept && req.headers.accept.includes('json')
        ? 'application/ld+json'
        : 'text/turtle';
    const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const convertedOparlData = await getEliData(oparlUrl, format, currentUrl);

    res.setHeader('Content-Type', 'text/turtle');
    res.send(convertedOparlData);
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
