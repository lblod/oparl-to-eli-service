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