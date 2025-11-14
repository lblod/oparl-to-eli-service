import ParserJsonld from '@rdfjs/parser-jsonld';
import { Store, Writer } from 'n3';
import { Readable } from 'stream';
import { QueryEngine } from '@comunica/query-sparql';
const engine = new QueryEngine();

import { SPARQL_CONSTRUCTS } from '../constants';

export async function convertOparlToEli(oparlData, format = 'text/turtle') {
  const oparlStore = new Store();
  const eliStore = new Store();
  const parser = new ParserJsonld();
  const inputStream = Readable.from([JSON.stringify(oparlData)]);
  for await (const quad of parser.import(inputStream)) {
    oparlStore.addQuad(quad);
  }

  for (const constructQuery of SPARQL_CONSTRUCTS) {
    const result = await engine.queryQuads(constructQuery, {
      sources: [oparlStore],
    });
    // First in store to prevent duplicate quads as response
    for await (const quad of result) {
      if (!eliStore.has(quad)) eliStore.addQuad(quad);
    }
  }
  const writer = new Writer({
    format,
    prefixes: {
      eli: 'http://data.europa.eu/eli/ontology#',
      'eli-dl': 'http://data.europa.eu/eli/ontology/dl#',
      dcterms: 'http://purl.org/dc/terms/',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    },
  });
  for await (const quad of eliStore) {
    // 
    writer.addQuad(quad);
  }

  return new Promise((resolve, reject) => {
    writer.end((err, output) => (err ? reject(err) : resolve(output)));
  });
}