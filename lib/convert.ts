// import ParserJsonld from '@rdfjs/parser-jsonld';
// import { Store, Writer } from 'n3';
// import { Readable } from 'stream';
// // import pkg from '@comunica/query-sparql';
// // const { newEngine } = pkg;
import { QueryEngine } from '@comunica/query-sparql';
const engine = new QueryEngine();

export async function convertOparlToEli(oparlData, accept = 'text/turtle') {
  // https://query.comunica.dev/#datasources=http%3A%2F%2Flocalhost%3A8888%2Foparl%2Foparl%2Fbody%2FFR%2Fpaper&query=PREFIX%20example%3A%20%3Chttp%3A%2F%2Fwww.example.org%2Frdf%23%3E%0Aconstruct%20%7B%0A%20%20%3Fs%20a%20example%3AThing%20.%0A%7D%0Awhere%20%7B%0A%20%20%3Fs%20a%20%3Chttps%3A%2F%2Fschema.oparl.org%2F1.0%2FPaper%3E%20.%0A%7D
  // 2️⃣ Parse JSON-LD → RDF store
  // const store = new Store();
  // const parser = new ParserJsonld({
  //   baseIRI: 'https://example.org/'
  // });
  // const inputStream = Readable.from([JSON.stringify(oparlData)]);
  // for await (const quad of parser.import(inputStream)) {
  //   store.addQuad(quad);
  // }

  // 3️⃣ SPARQL CONSTRUCT for ELI Work mapping
  // const constructQuery = `
  //   PREFIX oparl: <https://schema.oparl.org/>
  //   PREFIX eli: <http://data.europa.eu/eli/ontology#>
  //   PREFIX dcterms: <http://purl.org/dc/terms/>
  //   PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

  //   CONSTRUCT {
  //     ?paper a eli:Work ;
  //            dcterms:title ?title ;
  //            dcterms:identifier ?identifier ;
  //            eli:date_document ?date ;
  //            eli:work_type <http://example.org/id/concept/decision-type/DRAFT_DECISION> ;
  //            eli:is_realized_by ?mainFile ;
  //            eli:related_to ?auxFile ;
  //            dcterms:creator ?creator ;
  //            dcterms:contributor ?contributor .
  //   }
  //   WHERE {
  //     ?paper a oparl:Paper ;
  //            oparl:name ?title ;
  //            oparl:reference ?identifier ;
  //            oparl:date ?dateRaw .
  //     BIND(xsd:date(?dateRaw) AS ?date)
  //     OPTIONAL { ?paper oparl:mainFile ?mainFile . }
  //     OPTIONAL { ?paper oparl:auxiliaryFile ?auxFile . }
  //     OPTIONAL { 
  //       ?paper oparl:originatorPerson|oparl:originatorOrganization ?creator .
  //     }
  //     OPTIONAL { ?paper oparl:underDirectionOf ?contributor . }
  //   }
  // `;

  // 4️⃣ Execute SPARQL query using Comunica
  // const result = await engine.query(constructQuery, { sources: [store] });

  // if (result.type !== 'quads') throw new Error('Expected quads from CONSTRUCT');

  // // 5️⃣ Serialize the RDF
  // const format = accept.includes('json')
  //   ? 'application/ld+json'
  //   : 'text/turtle';
  // const writer = new Writer({
  //   format,
  //   prefixes: {
  //     eli: 'http://data.europa.eu/eli/ontology#',
  //     dcterms: 'http://purl.org/dc/terms/',
  //     xsd: 'http://www.w3.org/2001/XMLSchema#',
  //   },
  // });

  // for await (const quad of result) writer.addQuad(quad);

  // return new Promise((resolve, reject) => {
  //   writer.end((err, output) => (err ? reject(err) : resolve(output)));
  // });
}
