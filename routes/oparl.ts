import express, { Request, Response } from 'express';

import { OPARL_ENDPOINT } from '../config';
<<<<<<< HEAD
import { rewriteLinkWithProxy, fetchJson } from '../lib/utils';

const router = express.Router();

function enrichData(data, req: Request, fullUrl: string) {
  let dataBlock = [];
  if (data['data']) {
    dataBlock = data['data'];
  } else {
    dataBlock = [data];
  }
  let linksBlock = {
    id: fullUrl,
    type: 'Node',
  };
  if (data['links']) {
    linksBlock = { ...linksBlock, ...data['links'] };
  }
  // Add linkToPublications based on content
  if (dataBlock.length) {
    if (dataBlock[0]['type'].endsWith('System') && dataBlock[0]['body']) {
      const linkToBody = dataBlock[0]['body'];
      const linkToBodyWithProxy = rewriteLinkWithProxy(linkToBody, req);
      linksBlock['body'] = linkToBodyWithProxy.toString();
    }
    if (dataBlock[0]['type'].endsWith('Body')) {
      if (dataBlock[0]['organization']) {
        const linkToOrganization = dataBlock[0]['organization'];
        const linkToOrganizationWithProxy = rewriteLinkWithProxy(
          linkToOrganization,
          req,
        );
        linksBlock['organization'] = linkToOrganizationWithProxy.toString();
      }
      if (dataBlock[0]['person']) {
        const linkToPerson = dataBlock[0]['person'];
        const linkToPersonWithProxy = rewriteLinkWithProxy(linkToPerson, req);
        linksBlock['person'] = linkToPersonWithProxy.toString();
      }
      if (dataBlock[0]['meeting']) {
        const linkToMeeting = dataBlock[0]['meeting'];
        const linkToMeetingWithProxy = rewriteLinkWithProxy(linkToMeeting, req);
        linksBlock['meeting'] = linkToMeetingWithProxy.toString();
      }
      if (dataBlock[0]['paper']) {
        const linkToPaper = dataBlock[0]['paper'];
        const linkToPaperWithProxy = rewriteLinkWithProxy(linkToPaper, req);
        linksBlock['paper'] = linkToPaperWithProxy.toString();
      }
    }
    if (dataBlock[0]['type'].endsWith('System') && dataBlock[0]['body']) {
      const linkToBody = dataBlock[0]['body'];
      const linkToBodyWithProxy = rewriteLinkWithProxy(linkToBody, req);
      linksBlock['body'] = linkToBodyWithProxy.toString();
    }
  }
  // Add linkToPublications based on existing links
  if (data['links'] && data['links']['next']) {
    const linkToNext = data['links']['next'];
    const linkToNextWithProxy = rewriteLinkWithProxy(linkToNext, req);
    linksBlock['next'] = linkToNextWithProxy.toString();
  }

  // Enrich original response with context and overwrite links
  data['@context'] = `${req.protocol}://${req.get('host')}/context.jsonld`;
  data['links'] = linksBlock;

  return data;
}
// Route: GET /:entityType/:id
router.get(
  '/:entityType/:id?/:subType?/:page?/:pageNumber?',
  async (req: Request, res: Response) => {
    console.log('Received request:', req.params);
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    try {
      const oparlUrl = `${OPARL_ENDPOINT}${req.originalUrl.replace('/oparl', '')}`;

      let oparlData = await fetchJson(oparlUrl);

      oparlData = enrichData(oparlData, req, fullUrl);

      res.setHeader('Content-Type', 'application/ld+json');
      res.json(oparlData);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        res.status(500).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Unknown error' });
      }
=======
import { enrichOparlData, getOparlData } from '../lib/utils';

const router = express.Router();

router.get('/*', async (req: Request, res: Response) => {
  console.log('Received request:', req.params);
  try {
    const oparlUrl = `${OPARL_ENDPOINT}${req.path.substring(req.path.indexOf('/oparl') + 6)}`;
    let oparlData = await getOparlData(oparlUrl);
    oparlData = enrichOparlData(oparlData, req);

    res.setHeader('Content-Type', 'application/ld+json');
    res.json(oparlData);
  } catch (err: unknown) {
    console.error(err);
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: 'Unknown error' });
>>>>>>> 8570af0 (Separate route for oparl and eli)
    }
  }
});

export default router;
