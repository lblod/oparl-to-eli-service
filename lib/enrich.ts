import { EMBED_JSONLD_CONTEXT } from '../config';
import { OPARL_JSON_LD_CONTEXT } from '../constants';

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

/**
 * Changes the protocol and host of an URL with the protocol and host from the provided proxy URL. Also, adds the first segment of the path of the proxy URL.
 * For example, https://ris.freiburg.de/oparl/System becomes http://localhost:8888/eli/oparl/System
 * @param {string} originalUrl - URL that needs to be rewritten.
 * @param {string} proxyUrl - URL of the proxy
 * @returns {URL} URL object of the rewritten URL
 */
function rewriteLinkWithProxy(originalUrl: string, proxyUrl: string): URL {
  const originalUrlObj = new URL(originalUrl);
  const proxyUrlObj = new URL(proxyUrl);

  // replace host
  const protocol = proxyUrlObj.protocol;
  const host = proxyUrlObj.host;
  let firstSegment = '';
  // host is the same when harvesting
  if (host != originalUrlObj.host) {
    firstSegment = `/${proxyUrlObj.pathname.split('/')[1]}`; // 'eli' or 'oparl'
    console.log('first segment: ' + firstSegment);
  }

  const newUrl = new URL(originalUrl.toString());
  newUrl.protocol = protocol;
  newUrl.host = host;
  newUrl.pathname = `${firstSegment}${originalUrlObj.pathname}`;
  try {
    console.log('new url: ' + newUrl.toString());
    return newUrl;
  } catch (error) {
    console.error('Invalid URL:', originalUrl);
    return originalUrlObj; // Fallback to the original URL if parsing fails
  }
}

/**
 * Removes the schema version from an Oparl schema URL string
 * For example, https://schema.oparl.org/1.0/System becomes https://schema.oparl.org/System
 * @param {string} url - Oparl schema URL 
 * @returns {string} Oparl schema URL without version
 */
function removeVersionFromOparlSchemaUri(content: string): string {
  return content.replaceAll(/(schema\.oparl\.org)\/\d+\.\d+(?=\/|$)/g, '$1');
}
