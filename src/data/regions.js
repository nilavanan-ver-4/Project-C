// Export destinations. `cc` = ISO 3166-1 alpha-2 (names are localised with Intl.DisplayNames).
// Transit days are indicative sea-freight estimates from the configured export hub.
export const REGIONS = [
  {
    slug: 'europe',
    centroid: [49, 8],
    transit: '24 – 34',
    incoterms: ['CIF', 'CFR', 'FOB'],
    ports: ['Rotterdam', 'Hamburg', 'Valencia', 'Genoa', 'Le Havre', 'Felixstowe'],
    products: ['shrimp', 'fish', 'squid', 'valueadded'],
    destinations: [
      { cc: 'NL', port: 'Rotterdam', lat: 51.95, lon: 4.14 },
      { cc: 'DE', port: 'Hamburg', lat: 53.54, lon: 9.97 },
      { cc: 'ES', port: 'Valencia', lat: 39.45, lon: -0.32 },
      { cc: 'IT', port: 'Genoa', lat: 44.4, lon: 8.92 },
      { cc: 'FR', port: 'Le Havre', lat: 49.48, lon: 0.11 },
      { cc: 'GB', port: 'Felixstowe', lat: 51.96, lon: 1.35 },
    ],
  },
  {
    slug: 'middle-east',
    centroid: [25, 49],
    transit: '7 – 14',
    incoterms: ['CFR', 'CIF', 'FOB'],
    ports: ['Jebel Ali', 'Jeddah', 'Hamad', 'Shuwaikh'],
    products: ['shrimp', 'fish', 'crab', 'lobster'],
    destinations: [
      { cc: 'AE', port: 'Jebel Ali', lat: 25.01, lon: 55.06 },
      { cc: 'SA', port: 'Jeddah', lat: 21.48, lon: 39.17 },
      { cc: 'QA', port: 'Hamad', lat: 25.01, lon: 51.62 },
      { cc: 'KW', port: 'Shuwaikh', lat: 29.35, lon: 47.93 },
    ],
  },
  {
    slug: 'east-asia',
    centroid: [34, 124],
    transit: '12 – 22',
    incoterms: ['CIF', 'FOB', 'CFR'],
    ports: ['Yokohama', 'Shanghai', 'Busan', 'Hong Kong'],
    products: ['squid', 'prawn', 'crab', 'fish'],
    destinations: [
      { cc: 'JP', port: 'Yokohama', lat: 35.44, lon: 139.65 },
      { cc: 'CN', port: 'Shanghai', lat: 31.23, lon: 121.5 },
      { cc: 'KR', port: 'Busan', lat: 35.1, lon: 129.04 },
      { cc: 'HK', port: 'Hong Kong', lat: 22.3, lon: 114.17 },
    ],
  },
  {
    slug: 'north-america',
    centroid: [40, -95],
    transit: '28 – 38',
    incoterms: ['FOB', 'CIF', 'CFR'],
    ports: ['New York / New Jersey', 'Los Angeles', 'Vancouver'],
    products: ['shrimp', 'lobster', 'crab', 'valueadded'],
    destinations: [
      { cc: 'US', port: 'New York / New Jersey', lat: 40.68, lon: -74.04 },
      { cc: 'CA', port: 'Vancouver', lat: 49.29, lon: -123.11 },
    ],
  },
];

export const regionBySlug = Object.fromEntries(REGIONS.map((r) => [r.slug, r]));
export const ALL_DESTINATIONS = REGIONS.flatMap((r) => r.destinations.map((d) => ({ ...d, region: r.slug })));
