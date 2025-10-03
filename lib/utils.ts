import { Request } from 'express';

export function rewriteLinkWithProxy(originalUrl: URL, req: any): URL {
  // replace host
  const protocol = req.protocol;
  const host = req.get('host');
  const firstSegment = req.originalUrl.split('/')[1]; // 'eli' or 'oparl'

  const newUrl = new URL(originalUrl.toString());
  newUrl.protocol = protocol;
  newUrl.host = host;
  console.log("original url: " + originalUrl.toString());
  console.log("original pathname: " + originalUrl.pathname);
  newUrl.pathname = `/${firstSegment}${originalUrl.pathname}`;
  try {
    console.log("new url: " + newUrl.toString());
    return newUrl;
  } catch (error) {
    console.error('Invalid URL:', originalUrl);
    return originalUrl; // Fallback to the original URL if parsing fails
  }
}

export async function getOparlData(oparlUrl: string) {
  const response = await fetch(oparlUrl);
  console.log('Sent Oparl request:', oparlUrl);
  if (!response.ok) throw new Error(`OParl request failed: ${response.status}`);
  return await response.json();
}

export function enrichOparlData(oparlData: any, req: Request) {
  const currentUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  let dataBlock = [];
  if (oparlData['data']) {
    dataBlock = oparlData['data'];
  } else {
    dataBlock = [oparlData];
  }
  let linksBlock = {
    id: currentUrl,
    type: 'Node',
  };
  if (oparlData['links']) {
    linksBlock = { ...linksBlock, ...oparlData['links'] };
  }
  // Add linkToPublications based on content
  if (dataBlock.length) {
    if (dataBlock[0]['type'].endsWith('System') && dataBlock[0]['body']) {
      const linkToBody = new URL(dataBlock[0]['body']);
      const linkToBodyWithProxy = rewriteLinkWithProxy(linkToBody, req);
      linksBlock['body'] = linkToBodyWithProxy.toString();
    }
    if (dataBlock[0]['type'].endsWith('Body')) {
      if (dataBlock[0]['organization']) {
        const linkToOrganization = new URL(dataBlock[0]['organization']);
        const linkToOrganizationWithProxy = rewriteLinkWithProxy(
          linkToOrganization,
          req,
        );
        linksBlock['organization'] = linkToOrganizationWithProxy.toString();
      }
      if (dataBlock[0]['person']) {
        const linkToPerson = new URL(dataBlock[0]['person']);
        const linkToPersonWithProxy = rewriteLinkWithProxy(linkToPerson, req);
        linksBlock['person'] = linkToPersonWithProxy.toString();
      }
      if (dataBlock[0]['meeting']) {
        const linkToMeeting = new URL(dataBlock[0]['meeting']);
        const linkToMeetingWithProxy = rewriteLinkWithProxy(linkToMeeting, req);
        linksBlock['meeting'] = linkToMeetingWithProxy.toString();
      }
      if (dataBlock[0]['paper']) {
        const linkToPaper = new URL(dataBlock[0]['paper']);
        const linkToPaperWithProxy = rewriteLinkWithProxy(linkToPaper, req);
        linksBlock['paper'] = linkToPaperWithProxy.toString();
      }
    }
    if (dataBlock[0]['type'].endsWith('Meeting')) {
      for (const meeting of dataBlock) {
        if (meeting['agendaItem']) {
          for (const agendaItem of meeting['agendaItem']) {
            if (agendaItem['consultation']) {
              const linkToConsultation = new URL(agendaItem['consultation']);
              const linkToConsultationWithProxy = rewriteLinkWithProxy(
                linkToConsultation,
                req,
              );
              if (!linksBlock['consultation']) linksBlock['consultation'] = [];
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
    const linkToNext = new URL(oparlData['links']['next']);
    const linkToNextWithProxy = rewriteLinkWithProxy(linkToNext, req);
    linksBlock['next'] = linkToNextWithProxy.toString();
  }

  // Enrich original response with context and overwrite links
  oparlData['@context'] = `${req.protocol}://${req.get('host')}/context.json`;
  oparlData['links'] = linksBlock;

  return oparlData;
}
