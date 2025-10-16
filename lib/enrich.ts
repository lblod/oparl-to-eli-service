import { EMBED_JSONLD_CONTEXT } from '../config';
import { OPARL_JSON_LD_CONTEXT } from '../constants';
import { removeVersionFromOparlSchemaUri, rewriteLinkWithProxy } from './utils';

export function enrichOparlDataToJsonLd(oparlData: any, proxyUrl: string) {
  let dataBlock = [];
  if (oparlData['data']) {
    dataBlock = oparlData['data'];
  } else {
    dataBlock = [oparlData];
  }
  let linksBlock = {
    id: proxyUrl,
    type: 'Node',
  };
  if (oparlData['links']) {
    linksBlock = { ...linksBlock, ...oparlData['links'] };
  }
  // Add linkToPublications based on content
  if (dataBlock.length) {
    if (dataBlock[0]['type'].endsWith('System') && dataBlock[0]['body']) {
      const linkToBody = dataBlock[0]['body'];
      const linkToBodyWithProxy = rewriteLinkWithProxy(linkToBody, proxyUrl);
      linksBlock['body'] = linkToBodyWithProxy.toString();
    }
    if (dataBlock[0]['type'].endsWith('Body')) {
      if (dataBlock[0]['organization']) {
        const linkToOrganization = dataBlock[0]['organization'];
        const linkToOrganizationWithProxy = rewriteLinkWithProxy(
          linkToOrganization,
          proxyUrl,
        );
        linksBlock['organization'] = linkToOrganizationWithProxy.toString();
      }
      if (dataBlock[0]['person']) {
        const linkToPerson = dataBlock[0]['person'];
        const linkToPersonWithProxy = rewriteLinkWithProxy(
          linkToPerson,
          proxyUrl,
        );
        linksBlock['person'] = linkToPersonWithProxy.toString();
      }
      if (dataBlock[0]['meeting']) {
        const linkToMeeting = dataBlock[0]['meeting'];
        const linkToMeetingWithProxy = rewriteLinkWithProxy(
          linkToMeeting,
          proxyUrl,
        );
        linksBlock['meeting'] = linkToMeetingWithProxy.toString();
      }
      if (dataBlock[0]['paper']) {
        const linkToPaper = dataBlock[0]['paper'];
        const linkToPaperWithProxy = rewriteLinkWithProxy(
          linkToPaper,
          proxyUrl,
        );
        linksBlock['paper'] = linkToPaperWithProxy.toString();
      }
    }
    if (dataBlock[0]['type'].endsWith('Meeting')) {
      for (const meeting of dataBlock) {
        if (meeting['agendaItem']) {
          for (const agendaItem of meeting['agendaItem']) {
            if (agendaItem['consultation']) {
              const linkToConsultation = agendaItem['consultation'];
              const linkToConsultationWithProxy = rewriteLinkWithProxy(
                linkToConsultation,
                proxyUrl,
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
    const linkToNext = oparlData['links']['next'];
    const linkToNextWithProxy = rewriteLinkWithProxy(linkToNext, proxyUrl);
    linksBlock['next'] = linkToNextWithProxy.toString();
  }

  // Enrich original response with context and overwrite links
  if (!EMBED_JSONLD_CONTEXT)
    oparlData['@context'] =
      `${new URL(proxyUrl).protocol}://${new URL(proxyUrl).host}/context.json`;
  else oparlData['@context'] = OPARL_JSON_LD_CONTEXT['@context'];

  oparlData['links'] = linksBlock;

  // Remove version from schema URIs
  const oparlDataWithoutVersion = JSON.parse(
    removeVersionFromOparlSchemaUri(JSON.stringify(oparlData)),
  );
  return oparlDataWithoutVersion;
}
