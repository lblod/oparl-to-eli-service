export const OPARL_JSON_LD_CONTEXT = {
  '@context': {
    '@vocab': 'https://schema.oparl.org/',
    id: '@id',
    type: '@type',
    data: '@included',
    links: '@included',
    lblod: 'http://lblod.data.gift/vocabularies/besluit/',
    tree: 'https://w3id.org/tree#',
    Node: {
      '@id': 'tree:Node',
      '@type': '@id',
      '@context': {
        linkToPublication: {
          '@id': 'lblod:linkToPublication',
          '@type': '@id',
        },
        next: 'linkToPublication',
        body: 'linkToPublication',
        organization: 'linkToPublication',
        meeting: 'linkToPublication',
        person: 'linkToPublication',
        paper: 'linkToPublication',
        consultation: 'linkToPublication',
      },
    },
    pagination: null,
    first: null,
    last: null,
    self: null,
  },
};

export const SPARQL_CONSTRUCTS = [
  `PREFIX oparl: <https://schema.oparl.org/>
    PREFIX eli: <http://data.europa.eu/eli/ontology#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX eli-dl: <http://data.europa.eu/eli/ontology/dl#>

    CONSTRUCT {
      ?paper a eli:Work ;
              dcterms:title ?title ;
              dcterms:identifier ?identifier ;
              eli:date_document ?date ;
              eli:work_type ?paperTypeConcept ;
              eli:is_realized_by ?mainFileExpression ;
              eli:related_to ?auxFile ;
              dcterms:creator ?creator ;
              dcterms:contributor ?contributor .
    }
    WHERE {
      ?paper a oparl:Paper ;
              oparl:name ?title ;
              oparl:reference ?identifier ;
              oparl:date ?dateRaw ;
              oparl:paperType ?paperType .
      BIND(xsd:date(?dateRaw) AS ?date)
      BIND(IRI(CONCAT("http://data.lblod.info/id/concept/decision-type/", UCASE(REPLACE(STR(?paperType), " ", "-")))) AS ?paperTypeConcept)
      OPTIONAL { 
        ?paper oparl:mainFile ?mainFile . 
        BIND(IRI(CONCAT(STR(?mainFile), "/expression/de")) AS ?mainFileExpression)
      }
      OPTIONAL { ?paper oparl:auxiliaryFile ?auxFile . }
      OPTIONAL { 
        ?paper oparl:originatorPerson|oparl:originatorOrganization ?creator .
      }
      OPTIONAL { ?paper oparl:underDirectionOf ?contributor . }
    }`,
  `PREFIX eli: <http://data.europa.eu/eli/ontology#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX epvoc: <https://data.europarl.europa.eu/def/epvoc#>
PREFIX oparl: <https://schema.oparl.org/>

CONSTRUCT {
  ?expression a eli:Expression ;
    eli:title ?titleLang ;
    eli:language <http://publications.europa.eu/resource/authority/language/DEU> ;
    epvoc:expressionContent ?textLang ;
    eli:is_embodied_by ?file ;
    dcterms:created ?createdDT ;
    dcterms:modified ?modifiedDT .

  ?file a eli:Manifestation ;
    eli:media_type ?mimeType ;
    epvoc:byteSize ?size ;
    dcterms:issued ?issuedDate ;
    eli:is_exemplified_by ?accessUrl ;
    dcterms:created ?createdDT ;
    dcterms:modified ?modifiedDT .
}
WHERE {
  ?file a oparl:File ;
        oparl:name ?name ;
        oparl:mimeType ?mimeType ;
        oparl:size ?size ;
        oparl:created ?created ;
        oparl:modified ?modified ;
        oparl:text ?text ;
        oparl:accessUrl ?accessUrl .

  # Create derived IRIs and typed/language-tagged literals
  BIND(IRI(CONCAT(STR(?file), "/expression/de")) AS ?expression)
  BIND(STRLANG(?name, "de") AS ?titleLang)
  BIND(STRLANG(?text, "de") AS ?textLang)
  BIND(xsd:date(?date) AS ?issuedDate)
  BIND(xsd:dateTime(?created) AS ?createdDT)
  BIND(xsd:dateTime(?modified) AS ?modifiedDT)
}
  `,
  `PREFIX oparl: <https://schema.oparl.org/>
    PREFIX eli: <http://data.europa.eu/eli/ontology#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX eli-dl: <http://data.europa.eu/eli/ontology/dl#>

    CONSTRUCT {
      ?consultation a eli-dl:Activity ;
        eli-dl:based_on_a_realization_of ?paper ;
        eli-dl:executed ?agendaItem ;
        oparl:authoritative ?authoritative ;
        oparl:role ?role .
    }
    WHERE {
      ?paper a oparl:Paper ;
              oparl:consultation ?consultation .

      ?consultation a oparl:Consultation ;
              oparl:agendaItem ?agendaItem ;
              oparl:authoritative ?authoritative ;
              oparl:role ?role .
    }`,
];
