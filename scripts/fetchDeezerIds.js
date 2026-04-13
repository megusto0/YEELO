import { SONGS, ALBUM_INFO } from '../src/data/songs.js';
import fs from 'fs';

async function searchDeezer(query) {
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url);
  return res.json();
}

async function main() {
  const results = [];

  for (const song of SONGS) {
    const queries = [
      `artist:"Kanye West" track:"${song.title}"`,
      `kanye west ${song.title}`,
    ];

    let found = null;
    for (const q of queries) {
      if (found) break;
      try {
        const data = await searchDeezer(q);
        if (data.data && data.data.length > 0) {
          for (const track of data.data) {
            const artist = (track.artist?.name || '').toLowerCase();
            if (artist.includes('kanye') || artist.includes('west') || artist.includes('ye')) {
              if (track.preview) {
                found = { id: song.id, previewUrl: track.preview, title: song.title, matchedTitle: track.title };
                break;
              }
            }
          }
          if (!found && data.data[0]?.preview) {
            found = { id: song.id, previewUrl: data.data[0].preview, title: song.title, matchedTitle: data.data[0].title };
          }
        }
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 250));
    }

    if (found) {
      results.push(found);
      console.log(`  ✓ ${song.title} → ${found.previewUrl}`);
    } else {
      results.push({ id: song.id, previewUrl: null, title: song.title });
      console.log(`  ✗ ${song.title} — NOT FOUND`);
    }
  }

  fs.writeFileSync('preview-urls.json', JSON.stringify(results, null, 2));
  const foundCount = results.filter(r => r.previewUrl).length;
  console.log(`\nDone! ${foundCount}/${results.length} previews found. Written to preview-urls.json`);
}

main();
