// Media library. Leave `src` / `youtubeId` / `file` empty to show the built-in sample placeholders;
// fill them in and the gallery, films and downloads switch to the real assets (and JSON-LD picks them up at build time).
export const MEDIA = {
  photos: [
    { id: 'g1', icon: 'fish', src: '', width: 1600, height: 1000 },
    { id: 'g2', icon: 'shrimp', src: '', width: 1600, height: 1000 },
    { id: 'g3', icon: 'snow', src: '', width: 1600, height: 1000 },
    { id: 'g4', icon: 'valueadded', src: '', width: 1600, height: 1000 },
    { id: 'g5', icon: 'trace', src: '', width: 1600, height: 1000 },
    { id: 'g6', icon: 'crab', src: '', width: 1600, height: 1000 },
  ],
  // youtubeId: the 11-character id; uploadDate: ISO date; duration: ISO 8601 (e.g. 'PT2M30S')
  videos: [
    { id: 'v1', youtubeId: '', poster: '', uploadDate: '', duration: '' },
    { id: 'v2', youtubeId: '', poster: '', uploadDate: '', duration: '' },
  ],
  // file: path under /public (e.g. '/downloads/proj-c-catalogue.pdf'). Empty = "Request" opens the quote form.
  downloads: [
    { id: 'catalogue', file: '' },
    { id: 'specs', file: '' },
    { id: 'certs', file: '' },
    { id: 'brand', file: '' },
  ],
};
