import { SONGS, SONG_MAP, ALBUM_INFO } from '../data/songs';

export function getK(rd) {
  if (rd > 200) return 64;
  if (rd >= 100) return 32;
  return 16;
}

export function expectedScore(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

export function processMatch(songStates, idA, idB, winnerId) {
  const a = songStates[idA];
  const b = songStates[idB];
  if (!a || !b) return null;

  const eA = expectedScore(a.elo, b.elo);
  const eB = expectedScore(b.elo, a.elo);
  const kA = getK(a.rd);
  const kB = getK(b.rd);

  const sA = winnerId === idA ? 1 : 0;
  const sB = winnerId === idB ? 1 : 0;

  const oldEloA = a.elo;
  const oldEloB = b.elo;

  const newEloA = Math.round(a.elo + kA * (sA - eA));
  const newEloB = Math.round(b.elo + kB * (sB - eB));

  const eWinner = winnerId === idA ? eA : eB;
  const isUpset = eWinner < 0.5;
  const isClose = Math.abs(oldEloA - oldEloB) < 50;

  let rdDecay = 8;
  if (isUpset) rdDecay = 20;
  else if (isClose) rdDecay = 15;

  const newRdA = Math.max(30, a.rd - rdDecay);
  const newRdB = Math.max(30, b.rd - rdDecay);

  return {
    idA,
    idB,
    winnerId,
    oldEloA,
    oldEloB,
    newEloA,
    newEloB,
    oldRdA: a.rd,
    oldRdB: b.rd,
    newRdA,
    newRdB,
    rdDecay,
    sA,
    sB,
  };
}

export function applyAntiInflation(songStates) {
  const updated = { ...songStates };
  SONGS.forEach((s) => {
    const ss = updated[s.id];
    if (ss && ss.matches > 0) {
      updated[s.id] = {
        ...ss,
        elo: Math.round(ss.elo + 0.005 * (1500 - ss.elo)),
      };
    }
  });
  return updated;
}

export function selectMatchup(songStates, totalMatches, seenPairs, recentSongIds, queueSongId) {
  const songs = SONGS.filter(s => s.deezerId != null);
  const unplayed = songs.filter((s) => songStates[s.id]?.matches === 0);
  const played = songs.filter((s) => (songStates[s.id]?.matches || 0) > 0);

  let songA = null;
  let songB = null;

  if (queueSongId) {
    songA = queueSongId;
    const others = songs.filter((s) => s.id !== songA);
    songB = pickOpponent(songA, others, songStates);
    if (!songB) {
      songB = others[Math.floor(Math.random() * others.length)].id;
    }
    const pos = Math.random() < 0.5;
    return { left: pos ? songA : songB, right: pos ? songB : songA };
  }

  if (totalMatches < 20 && unplayed.length >= 2) {
    const shuffled = [...unplayed].sort(() => Math.random() - 0.5);
    const crossAlbum = shuffled.filter((s) => s.album !== shuffled[0].album);
    songA = shuffled[0].id;
    if (crossAlbum.length > 0 && Math.random() < 0.8) {
      songB = crossAlbum[Math.floor(Math.random() * crossAlbum.length)].id;
    } else {
      songB = shuffled[1].id;
    }
  } else if (totalMatches > 0 && (totalMatches + 1) % 5 === 0) {
    const highRD = songs.filter(
      (s) => songStates[s.id]?.rd > 200 && (songStates[s.id]?.matches || 0) > 0
    );
    if (highRD.length >= 1) {
      const pick = highRD[Math.floor(Math.random() * highRD.length)];
      songA = pick.id;
      const nearby = songs.filter(
        (s) => s.id !== songA && Math.abs((songStates[s.id]?.elo || 1500) - (songStates[songA]?.elo || 1500)) < 300
      );
      if (nearby.length > 0) {
        songB = nearby[Math.floor(Math.random() * nearby.length)].id;
      }
    }
  }

  if (!songA || !songB) {
    const candidates = played.length >= 2 ? played : songs;
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    songA = shuffled[0].id;

    const eloA = songStates[songA]?.elo || 1500;
    let window_ = 150;
    let attempts = 0;

    while (attempts < 20) {
      const nearby = candidates.filter((s) => {
        if (s.id === songA) return false;
        if (Math.abs((songStates[s.id]?.elo || 1500) - eloA) > window_) return false;
        if (recentSongIds.slice(-6).includes(s.id)) return false;
        return true;
      });
      if (nearby.length >= 2) break;
      window_ += 25;
      attempts++;
    }

    const valid = candidates.filter((s) => {
      if (s.id === songA) return false;
      if (recentSongIds.slice(-6).includes(s.id)) return false;
      return Math.abs((songStates[s.id]?.elo || 1500) - eloA) <= window_;
    });

    if (valid.length > 0) {
      const crossAlbum = valid.filter((s) => s.album !== SONG_MAP[songA].album);
      if (crossAlbum.length > 0 && Math.random() < 0.8) {
        songB = crossAlbum[Math.floor(Math.random() * crossAlbum.length)].id;
      } else {
        songB = valid[Math.floor(Math.random() * valid.length)].id;
      }
    } else {
      const any = candidates.filter((s) => s.id !== songA);
      songB = any[Math.floor(Math.random() * any.length)].id;
    }
  }

  const pairKey = songA < songB ? songA + '|' + songB : songB + '|' + songA;
  if (seenPairs.has(pairKey)) {
    const allSongs = songs.filter((s) => s.id !== songA);
    const unused = allSongs.filter((s) => {
      const pk = s.id < songA ? s.id + '|' + songA : songA + '|' + s.id;
      return !seenPairs.has(pk);
    });
    if (unused.length > 0) {
      songB = unused[Math.floor(Math.random() * unused.length)].id;
    }
  }

  if (!songB) {
    const fallback = songs.filter((s) => s.id !== songA);
    songB = fallback[Math.floor(Math.random() * fallback.length)].id;
  }

  const pos = Math.random() < 0.5;
  return { left: pos ? songA : songB, right: pos ? songB : songA };
}

function pickOpponent(songId, candidates, songStates) {
  const elo = songStates[songId]?.elo || 1500;
  let w = 150;
  for (let i = 0; i < 15; i++) {
    const nearby = candidates.filter(
      (s) => Math.abs((songStates[s.id]?.elo || 1500) - elo) <= w && s.id !== songId
    );
    if (nearby.length > 0) return nearby[Math.floor(Math.random() * nearby.length)].id;
    w += 25;
  }
  return null;
}

export function computeAlbumScore(songStates, albumId) {
  const albumSongs = SONGS.filter((s) => s.album === albumId);
  const rated = albumSongs.filter(
    (s) => songStates[s.id] && songStates[s.id].matches > 0
  );
  if (rated.length === 0) return null;

  let wSum = 0;
  let wTotal = 0;
  rated.forEach((s) => {
    const ss = songStates[s.id];
    const w = 1 / Math.pow(1 + ss.rd / 100, 2);
    wSum += ss.elo * w;
    wTotal += w;
  });
  const weightedAvg = wTotal > 0 ? wSum / wTotal : 1500;

  const sorted = [...rated].sort(
    (a, b) => songStates[b.id].elo - songStates[a.id].elo
  );
  const p1 = songStates[sorted[0].id].elo;
  const p2 = sorted.length > 1 ? songStates[sorted[1].id].elo : p1;
  const p3 = sorted.length > 2 ? songStates[sorted[2].id].elo : p2;

  const composite = 0.55 * weightedAvg + 0.25 * p1 + 0.12 * p2 + 0.08 * p3;
  const rawAvg =
    rated.reduce((sum, s) => sum + songStates[s.id].elo, 0) / rated.length;

  return {
    composite: Math.round(composite),
    rawAvg: Math.round(rawAvg),
    peakSong: sorted[0],
    peakElo: p1,
    ratedCount: rated.length,
    totalCount: albumSongs.length,
    songs: sorted,
  };
}

export function getConfidence(rd, matches) {
  if (matches === 0) return { text: 'UNRANKED', cls: 'unranked' };
  if (rd > 200) return { text: 'NEW', cls: 'new' };
  if (rd >= 100) return { text: 'MED', cls: 'med' };
  return { text: 'HIGH', cls: 'high' };
}

export function getAlbumConfidence(ratedCount, totalCount) {
  const pct = ratedCount / totalCount;
  if (ratedCount === 0) return { text: 'UNRANKED', cls: 'unranked' };
  if (pct < 0.3) return { text: 'LOW', cls: 'low' };
  if (pct < 0.7) return { text: 'MED', cls: 'med' };
  return { text: 'HIGH', cls: 'high' };
}
