import { EMBED_JSONLD_CONTEXT } from '../config';
import { OPARL_JSON_LD_CONTEXT } from '../constants';
import { removeVersionFromOparlSchemaUri, rewriteLinkWithProxy } from './utils';

export function enrichOparlDataToJsonLd(oparlData, proxyUrl: string) {
  const dataBlock = createDataArrayFromJSON(oparlData);
  // The Proxy URL is a tree:Node containing linkToPublications and pagination links
  const page = {
    id: proxyUrl,
    type: 'Node',
  };
  // Create links block with page if not exists
  // Add existing links from JSON
  oparlData['links'] = { ...page, ...oparlData['links'] };

  addLinkToPublications(dataBlock, oparlData['links'], proxyUrl);
  addExistingPaginationLinks(oparlData, oparlData['links'], proxyUrl);

  // Enrich original response with JSON-LD context
  if (!EMBED_JSONLD_CONTEXT)
    oparlData['@context'] =
      `${new URL(proxyUrl).protocol}://${new URL(proxyUrl).host}/context.json`;
  else oparlData['@context'] = OPARL_JSON_LD_CONTEXT['@context'];

  // Remove version from schema URIs
  const oparlDataWithoutVersion = JSON.parse(
    removeVersionFromOparlSchemaUri(JSON.stringify(oparlData)),
  );
  return oparlDataWithoutVersion;
}

function createDataArrayFromJSON(jsonData) {
  let dataArray = [];
  if (jsonData['data']) {
    dataArray = jsonData['data'];
  } else {
    dataArray = [jsonData];
  }
  return dataArray;
}

function addExistingPaginationLinks(oparlData, linksBlock, proxyUrl: string) {
  // We are only interested in the next pagination link for harvesting
  if (oparlData['links'] && oparlData['links']['next']) {
    const linkToNext = oparlData['links']['next'];
    const linkToNextWithProxy = rewriteLinkWithProxy(linkToNext, proxyUrl);
    linksBlock['next'] = linkToNextWithProxy.toString();
  }
}

function addLinkToPublications(dataBlock, linksBlock, proxyUrl: string) {
  if (!dataBlock.length) return;

  const item = dataBlock[0];

  handleSystemLinks(item, linksBlock, proxyUrl);
  handleBodyLinks(item, linksBlock, proxyUrl);
  handleMeetingLinks(dataBlock, linksBlock, proxyUrl);
}

function handleSystemLinks(item, linksBlock, proxyUrl) {
  if (item.type.endsWith("System") && item.body) {
    rewriteAndAssign(item.body, linksBlock, "body", proxyUrl);
  }
}

function handleBodyLinks(item, linksBlock, proxyUrl) {
  if (!item.type.endsWith("Body")) return;

  rewriteAndAssign(item.organization, linksBlock, "organization", proxyUrl);
  rewriteAndAssign(item.person, linksBlock, "person", proxyUrl);
  rewriteAndAssign(item.meeting, linksBlock, "meeting", proxyUrl);
  rewriteAndAssign(item.paper, linksBlock, "paper", proxyUrl);
}

function handleMeetingLinks(dataBlock, linksBlock, proxyUrl) {
  if (!dataBlock[0].type.endsWith("Meeting")) return;

  for (const meeting of dataBlock) {
    if (!meeting.agendaItem) continue;

    for (const agendaItem of meeting.agendaItem) {
      if (!agendaItem.consultation) continue;
      const rewritten = rewriteLinkWithProxy(agendaItem.consultation, proxyUrl);

      if (!linksBlock.consultation) linksBlock.consultation = [];
      linksBlock.consultation.push(rewritten.toString());
    }
  }
}

function rewriteAndAssign(
  sourceLink: string,
  targetObj,
  jsonKey: string,
  proxyUrl: string,
) {
  if (!sourceLink) return;
  const rewritten = rewriteLinkWithProxy(sourceLink, proxyUrl);
  targetObj[jsonKey] = rewritten.toString();
}