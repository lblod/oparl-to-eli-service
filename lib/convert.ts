import ParserJsonld from '@rdfjs/parser-jsonld';
import { Store, Writer } from 'n3';
import { Readable } from 'stream';
import { QueryEngine } from '@comunica/query-sparql-rdfjs-lite';
const engine = new QueryEngine();

import { PREFIXES, SPARQL_CONSTRUCTS } from '../constants';

export async function convertOparlToEli(
  oparlData,
  format: string = 'text/turtle',
  prefixes: Record<string, string> = PREFIXES,
) {
  const oparlStore = new Store();
  const eliStore = new Store();
  const parser = new ParserJsonld();
  const inputStream = Readable.from([JSON.stringify(oparlData)]);
  for await (const quad of parser.import(inputStream)) {
    oparlStore.addQuad(quad);
  }

  // An OParl object can embed other OParl resources (e.g. a Paper can embed its Files)
  // Therefore, we execute multiple SPARQL CONSTRUCT queries on an OParl response and merge the triples in a store
  // A store is also needed to prevent writing multiple times the same triple in the N3 Writer
  for (const { query } of SPARQL_CONSTRUCTS) {
    const result = await engine.queryQuads(query, {
      sources: [{ type: 'rdfjs', value: oparlStore }],
    });
    for await (const quad of result) {
      eliStore.addQuad(quad);
    }
  }
  const writer = new Writer({
    format,
    prefixes: prefixes,
  });
  for await (const quad of eliStore) {
    writer.addQuad(quad);
  }

  return new Promise((resolve, reject) => {
    writer.end((err, output) => (err ? reject(err) : resolve(output)));
  });
}