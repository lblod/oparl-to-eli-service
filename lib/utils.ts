import { convertOparlToEli } from './convert';
import { Parser, Store } from 'n3';
import { enrichOparlDataToJsonLd } from './enrich';
import { LINK_TO_PUBLICATION_PREDICATE } from '../constants';
import { MAX_OPARL_RETRIES } from '../config';

/**
 * Fetch with logging and returning JSON
 * @param {string} oparlUrl - Oparl API URL
 * @param {number} retries - number of times to retry requests, defaults to MAX_OPARL_RETRIES
 * @returns {object} JSON response
 */
export async function getOparlData(oparlUrl: string, retries = MAX_OPARL_RETRIES) {
  const response = await fetch(oparlUrl).catch(async (e) => {
    console.warn(`Failed sending OPARL request: `, e);
    return { ok: false, status: 0, json: () => {} };
  });
  console.log('Sent Oparl request:', oparlUrl);
  if (!response.ok){
    if(retries > 0){
      console.warn(`Failed OPARL request, ${retries} retries left`);
      await new Promise((resolve) => setTimeout(resolve, 500 * 10**(MAX_OPARL_RETRIES - retries)));
      return getOparlData(oparlUrl, retries - 1);
    }else{
      console.error(`Failed OPARL request, no retries left. Last status: `, response.status);
      throw new Error('');
    }
  } 
  
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
  oparlData = await convertOparlToEli(oparlData, format);
  return oparlData;
}

export function parseStringIntoStore(
  data: string,
  format: string = 'text/turtle',
): Store {
  const parser = new Parser({ format: format });
  const store = new Store();

  // Parse the Turtle data into quads
  const quads = parser.parse(data);
  store.addQuads(quads);

  return store;
}
/**
 * Extracts all URLs from quads with predicate lblod:linkToPublication from Turtle data.
 * @param {string} convertedOparlData - RDF data in Turtle syntax.
 * @returns {Array} Array of linkToPublication URLs.
 */
export function extractLinkToPublications(convertedOparlData) {
  const store = parseStringIntoStore(convertedOparlData);

  // Get all quads with the linkToPublication predicate
  const matchingQuads = store.getQuads(
    null,
    LINK_TO_PUBLICATION_PREDICATE,
    null,
    null,
  );

  return matchingQuads.map((quad) => quad.object.value);
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

export function convertPrefixesObjectToSPARQLPrefixes(
  prefixesObj: Record<string, string>,
): string {
  let prefixesStr = '';
  for (const [prefix, uri] of Object.entries(prefixesObj)) {
    prefixesStr += `PREFIX ${prefix}: <${uri}>\n`;
  }
  return prefixesStr;
}
