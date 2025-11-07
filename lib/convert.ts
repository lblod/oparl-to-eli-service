import ParserJsonld from '@rdfjs/parser-jsonld';
import { Store, Writer } from 'n3';
import { Readable } from 'stream';
import { QueryEngine } from '@comunica/query-sparql';
const engine = new QueryEngine();

import { SPARQL_CONSTRUCTS } from '../constants';

export async function convertOparlToEli(oparlData, format = 'text/turtle') {
  //  https://query.comunica.dev/#datasources=http%3A%2F%2Flocalhost%3A8888%2Foparl%2Foparl%2Fbody%2FFR%2Fpaper&query=PREFIX%20example%3A%20%3Chttp%3A%2F%2Fwww.example.org%2Frdf%23%3E%0Aconstruct%20%7B%0A%20%20%3Fs%20a%20example%3AThing%20.%0A%7D%0Awhere%20%7B%0A%20%20%3Fs%20a%20%3Chttps%3A%2F%2Fschema.oparl.org%2F1.0%2FPaper%3E%20.%0A%7D
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