import { convertOparlToEli } from './convert';
import { Parser, Store } from 'n3';
import { enrichOparlDataToJsonLd } from './enrich';

/**
 * Changes the protocol and host of an URL with the protocol and host from the provided proxy URL. Also, adds the first segment of the path of the proxy URL.
 * For example, https://ris.freiburg.de/oparl/System becomes http://localhost:8888/eli/oparl/System
 * @param {string} originalUrl - URL that needs to be rewritten.
 * @param {string} proxyUrl - URL of the proxy
 * @returns {URL} URL object of the rewritten URL
 */
export function rewriteLinkWithProxy(originalUrl: string, proxyUrl: string): URL {
  const originalUrlObj = new URL(originalUrl);
  const proxyUrlObj = new URL(proxyUrl);

  // replace host
  const protocol = proxyUrlObj.protocol;
  const host = proxyUrlObj.host;
  let firstSegment = proxyUrlObj.toString().split('/')[1]; // 'eli' or 'oparl' or '' in harvesting
  console.log('first segment: ' + firstSegment);
  if (firstSegment != '') firstSegment = `/${firstSegment}`;

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
export function removeVersionFromOparlSchemaUri(url: string): string {
  return url.replaceAll(/(schema\.oparl\.org)\/\d+\.\d+(?=\/|$)/g, '$1');
}

/**
 * Fetch with logging and returning JSON
 * @param {string} oparlUrl - Oparl API URL 
 * @returns {object} JSON response
 */
export async function getOparlData(oparlUrl: string) {
  const response = await fetch(oparlUrl);
  console.log('Sent Oparl request:', oparlUrl);
  if (!response.ok) throw new Error(`OParl request failed: ${response.status}`);
  return await response.json();
}

/**
 * Wrapper to fetch Oparl API JSON, convert to JSON-LD with linkToPublications, and convert to ELI
 * @param {string} oparlUrl - Oparl API URL
 * @param {string} format - format of the ELI data, see N3 serializations
 * @param {string} proxyUrl - URL string used to rewrite OParl URL
 * @returns {object} JSON response
 */
export async function getEliData(
  oparlUrl: string,
  format: string,
  proxyUrl: string,
) {
  let oparlData = await getOparlData(oparlUrl);
  oparlData = enrichOparlDataToJsonLd(oparlData, proxyUrl);
  return await convertOparlToEli(oparlData, format);
}

/**
 * Extracts all URLs from quads with predicate lblod:linkToPublication from Turtle data.
 * @param {string} convertedOparlData - RDF data in Turtle syntax.
 * @returns {Array} Array of linkToPublication URLs.
 */
export function extractLinkToPublications(convertedOparlData) {
  const parser = new Parser({ format: 'text/turtle' });
  const store = new Store();

  // Parse the Turtle data into quads
  const quads = parser.parse(convertedOparlData);
  store.addQuads(quads);

  // Define the predicate URI for lblod:linkToPublication
  const predicate = 'http://lblod.data.gift/vocabularies/besluit/linkToPublication';

  // Get all quads with that predicate
  const matchingQuads = store.getQuads(null, predicate, null, null);

  return matchingQuads.map(quad => quad.object.value);
}

/**
 * convert results of select query to an array of objects.
 * courtesy: Niels Vandekeybus & Felix
 * @method parseResult
 * @return {Array}
 */
export function parseResult(result) {
  if (!(result.results && result.results.bindings.length)) return [];

  const bindingKeys = result.head.vars;
  return result.results.bindings.map((row) => {
    const obj = {};
    bindingKeys.forEach((key) => {
      if (
        row[key] &&
        row[key].datatype == 'http://www.w3.org/2001/XMLSchema#integer' &&
        row[key].value
      ) {
        obj[key] = parseInt(row[key].value);
      } else if (
        row[key] &&
        row[key].datatype == 'http://www.w3.org/2001/XMLSchema#dateTime' &&
        row[key].value
      ) {
        obj[key] = new Date(row[key].value);
      } else obj[key] = row[key] ? row[key].value : undefined;
    });
    return obj;
  });
}
