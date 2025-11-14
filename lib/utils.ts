import { convertOparlToEli } from './convert';
import { Parser, Store } from 'n3';
import { enrichOparlDataToJsonLd } from './enrich';
import { PREFIXES } from '../constants';

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
  prefixes: Record<string, string>,
) {
  let oparlData = await getOparlData(oparlUrl);
  oparlData = enrichOparlDataToJsonLd(oparlData, proxyUrl);
  oparlData = await convertOparlToEli(oparlData, format, prefixes);
  return oparlData;
}

export function parseTurtleIntoStore(turtleData: string): Store {
  const parser = new Parser({ format: 'text/turtle' });
  const store = new Store();

  // Parse the Turtle data into quads
  const quads = parser.parse(turtleData);
  store.addQuads(quads);

  return store;
}
/**
 * Extracts all URLs from quads with predicate lblod:linkToPublication from Turtle data.
 * @param {string} convertedOparlData - RDF data in Turtle syntax.
 * @returns {Array} Array of linkToPublication URLs.
 */
export function extractLinkToPublications(convertedOparlData) {
  const store = parseTurtleIntoStore(convertedOparlData);

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

export function convertPrefixesObjectToSPARQLPrefixes(prefixesObj: Record<string, string>): string {
  let prefixesStr = '';
  for (const [prefix, uri] of Object.entries(prefixesObj)) {
    prefixesStr += `PREFIX ${prefix}: <${uri}>\n`;
  }
  return prefixesStr;
}

export function toSparqlLiteral(lit) {
  // Remove the leading and trailing quote if present
  const hasLangTag = lit.match(/"[^]*"(@[a-zA-Z-]+)?$/);
  let language = "";
  let content = lit;

  // Extract language tag if present
  const langMatch = lit.match(/"[^]*"(@[a-zA-Z-]+)$/);
  if (langMatch) {
      language = langMatch[1]; // e.g. @de
      content = lit.slice(0, lit.length - language.length);
  }

  // Strip the surrounding quotes
  if (content.startsWith('"') && content.endsWith('"')) {
      content = content.slice(1, -1);
  }

  const needsLongLiteral =
      content.includes("\n") ||
      content.includes("\r") ||
      content.includes('"'); // inner quotes break short literals

  if (needsLongLiteral) {
      // Escape ONLY the triple-quote sequence if it appears
      const safeContent = content.replace(/"""/g, '\\"""');
      return `"""${safeContent}"""${language}`;
  }

  // Safe short literal
  const escaped = content.replace(/"/g, '\\"');
  return `"${escaped}"${language}`;
}
