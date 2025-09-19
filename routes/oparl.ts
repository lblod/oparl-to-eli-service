import express, { Request, Response } from 'express';

import { OPARL_ENDPOINT } from '../config';
import { OPARL_JSON_LD_CONTEXT } from '../constants';
import { json } from 'body-parser';
import { rewriteLinkWithProxy } from '../lib/utils';

const router = express.Router();

// Route: GET /:entityType/:id
router.get(
  '/:entityType/:id?/:subType?/:page?/:pageNumber?',
  async (req: Request, res: Response) => {
    console.log('Received request:', req.params);
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    try {
      const oparlUrl = `${OPARL_ENDPOINT}${req.originalUrl.replace('/oparl', '')}`;
      const response = await fetch(oparlUrl);
      console.log('Sent Oparl request:', oparlUrl);
      if (!response.ok)
        throw new Error(`OParl request failed: ${response.status}`);

      const oparlData = await response.json();
      let dataBlock: any = [];
      if (oparlData['data']) {
        dataBlock = oparlData['data'];
      } else {
        dataBlock = [oparlData];
      }
      let linksBlock: any = {
        id: fullUrl,
        type: 'Node',
      };
      if (oparlData['links']) {
        linksBlock = { ...linksBlock, ...oparlData['links'] };
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
            const linkToPersonWithProxy = rewriteLinkWithProxy(
              linkToPerson,
              req,
            );
            linksBlock['person'] = linkToPersonWithProxy.toString();
          }
          if (dataBlock[0]['meeting']) {
            const linkToMeeting = dataBlock[0]['meeting'];
            const linkToMeetingWithProxy = rewriteLinkWithProxy(
              linkToMeeting,
              req,
            );
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
        if (dataBlock[0]['type'].endsWith('Meeting')) {
          for (const meeting of dataBlock) {
            if (meeting['agendaItem']) {
              for (const agendaItem of meeting['agendaItem']) {
                if (agendaItem['consultation']) {
                  const linkToConsultation = agendaItem['consultation'];
                  const linkToConsultationWithProxy = rewriteLinkWithProxy(
                    linkToConsultation,
                    req,
                  );
                  if (!linksBlock['consultation'])
                    linksBlock['consultation'] = [];
                  linksBlock['consultation'].push(
                    linkToConsultationWithProxy.toString(),
                  );
                }
              }
            }
          }
        }
      }
      // Add linkToPublications based on existing links
      if (oparlData['links'] && oparlData['links']['next']) {
        const linkToNext = oparlData['links']['next'];
        const linkToNextWithProxy = rewriteLinkWithProxy(linkToNext, req);
        linksBlock['next'] = linkToNextWithProxy.toString();
      }

      // Enrich original response with context and overwrite links
      oparlData['@context'] = OPARL_JSON_LD_CONTEXT['@context'];
      oparlData['links'] = linksBlock;

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
  },
);

export default router;
