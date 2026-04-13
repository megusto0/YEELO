import { create } from 'zustand';
import { SONGS } from './data/songs';
import { processMatch, applyAntiInflation } from './logic/rankingLogic';

const STORAGE_KEY = 'kanye-elo-v2';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('localStorage save failed', e);
  }
}

function createDefaultSongStates() {
  const states = {};
  SONGS.forEach((s) => {
    states[s.id] = { elo: 1500, rd: 350, wins: 0, losses: 0, matches: 0, eloHistory: [] };
  });
  return states;
}

function mergeDefaults(songStates) {
  const states = { ...songStates };
  SONGS.forEach((s) => {
    if (!states[s.id]) {
      states[s.id] = { elo: 1500, rd: 350, wins: 0, losses: 0, matches: 0, eloHistory: [] };
    }
  });
  return states;
}

const saved = loadFromStorage();

const useStore = create((set, get) => ({
  songStates: saved?.songStates ? mergeDefaults(saved.songStates) : createDefaultSongStates(),
  matchHistory: saved?.matchHistory || [],
  totalMatches: saved?.totalMatches || 0,
  seenPairs: new Set(saved?.seenPairs || []),
  recentSongIds: [],
  currentTab: 'battle',
  currentMatchup: null,
  lastMatch: null,
  isAnimating: false,
  queueSongId: null,
  onboarded: saved?.onboarded || false,
  settingsOpen: false,
  songFilter: '',
  songAlbumFilter: '',
  songSort: 'elo',
  expandedSong: null,
  expandedAlbum: null,

  save() {
    const s = get();
    saveToStorage({
      songStates: s.songStates,
      matchHistory: s.matchHistory.slice(-500),
      totalMatches: s.totalMatches,
      seenPairs: Array.from(s.seenPairs),
      onboarded: s.onboarded,
    });
  },

  setTab(tab) {
    set({ currentTab: tab });
  },

  setCurrentMatchup(matchup) {
    set({ currentMatchup: matchup });
  },

  setQueueSongId(id) {
    set({ queueSongId: id });
  },

  setAnimating(val) {
    set({ isAnimating: val });
  },

  setLastMatch(m) {
    set({ lastMatch: m });
  },

  recordMatch(idA, idB, winnerId) {
    const s = get();
    const result = processMatch(s.songStates, idA, idB, winnerId);
    if (!result) return;

    const newSongStates = { ...s.songStates };
    const a = { ...newSongStates[idA] };
    const b = { ...newSongStates[idB] };

    a.elo = result.newEloA;
    b.elo = result.newEloB;
    a.rd = result.newRdA;
    b.rd = result.newRdB;
    a.matches++;
    b.matches++;
    if (result.sA === 1) {
      a.wins++;
      b.losses++;
    } else {
      a.losses++;
      b.wins++;
    }
    a.eloHistory = [...a.eloHistory, result.newEloA].slice(-50);
    b.eloHistory = [...b.eloHistory, result.newEloB].slice(-50);

    newSongStates[idA] = a;
    newSongStates[idB] = b;

    const pairKey = idA < idB ? idA + '|' + idB : idB + '|' + idA;
    const newSeenPairs = new Set(s.seenPairs);
    newSeenPairs.add(pairKey);

    const newRecent = [...s.recentSongIds, idA, idB].slice(-20);

    const matchEntry = {
      song1: idA,
      song2: idB,
      winner: winnerId,
      timestamp: Date.now(),
      eloChanges: { a: result.oldEloA, newA: result.newEloA, b: result.oldEloB, newB: result.newEloB },
    };
    const newHistory = [...s.matchHistory, matchEntry].slice(-500);

    const newTotal = s.totalMatches + 1;

    const lastMatch = {
      songA: idA,
      songB: idB,
      winner: winnerId,
      eloA: result.oldEloA,
      eloB: result.oldEloB,
      newEloA: result.newEloA,
      newEloB: result.newEloB,
      rdA: result.oldRdA,
      rdB: result.oldRdB,
    };

    let finalSongStates = newSongStates;
    if (newTotal % 50 === 0) {
      finalSongStates = applyAntiInflation(newSongStates);
    }

    set({
      songStates: finalSongStates,
      matchHistory: newHistory,
      totalMatches: newTotal,
      seenPairs: newSeenPairs,
      recentSongIds: newRecent,
      lastMatch,
    });

    get().save();
  },

  undoLastMatch() {
    const s = get();
    if (!s.lastMatch) return;
    const m = s.lastMatch;

    const newSongStates = { ...s.songStates };
    const a = { ...newSongStates[m.songA] };
    const b = { ...newSongStates[m.songB] };

    a.elo = m.eloA;
    b.elo = m.eloB;
    a.rd = m.rdA;
    b.rd = m.rdB;
    a.matches--;
    b.matches--;
    if (m.winner === m.songA) {
      a.wins--;
      b.losses--;
    } else {
      a.losses--;
      b.wins--;
    }
    if (a.eloHistory.length) a.eloHistory = a.eloHistory.slice(0, -1);
    if (b.eloHistory.length) b.eloHistory = b.eloHistory.slice(0, -1);

    newSongStates[m.songA] = a;
    newSongStates[m.songB] = b;

    const newHistory = s.matchHistory.slice(0, -1);
    const newRecent = s.recentSongIds.slice(0, -2);

    set({
      songStates: newSongStates,
      matchHistory: newHistory,
      totalMatches: s.totalMatches - 1,
      recentSongIds: newRecent,
      lastMatch: null,
      currentMatchup: { left: m.songA, right: m.songB },
    });

    get().save();
  },

  dismissOnboarding() {
    set({ onboarded: true });
    get().save();
  },

  setSettingsOpen(val) {
    set({ settingsOpen: val });
  },

  setSongFilter(val) {
    set({ songFilter: val });
  },
  setSongAlbumFilter(val) {
    set({ songAlbumFilter: val });
  },
  setSongSort(val) {
    set({ songSort: val });
  },
  setExpandedSong(id) {
    set({ expandedSong: id });
  },
  setExpandedAlbum(id) {
    set({ expandedAlbum: id });
  },

  exportData() {
    const s = get();
    const data = {
      songStates: s.songStates,
      matchHistory: s.matchHistory,
      totalMatches: s.totalMatches,
      seenPairs: Array.from(s.seenPairs),
      onboarded: s.onboarded,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kanye-elo-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  importData(jsonStr, mode) {
    try {
      const data = JSON.parse(jsonStr);
      let newSongStates, newHistory, newTotal, newSeenPairs;

      if (mode === 'replace') {
        newSongStates = mergeDefaults(data.songStates || {});
        newHistory = data.matchHistory || [];
        newTotal = data.totalMatches || 0;
        newSeenPairs = new Set(data.seenPairs || []);
      } else {
        const existing = get().songStates;
        const imported = data.songStates || {};
        newSongStates = { ...existing };
        Object.keys(imported).forEach((k) => {
          if (!newSongStates[k]) {
            newSongStates[k] = imported[k];
          }
        });
        newHistory = [...get().matchHistory, ...(data.matchHistory || [])].slice(-500);
        newTotal = get().totalMatches + (data.totalMatches || 0);
        newSeenPairs = new Set(get().seenPairs);
        (data.seenPairs || []).forEach((p) => newSeenPairs.add(p));
      }

      set({
        songStates: mergeDefaults(newSongStates),
        matchHistory: newHistory,
        totalMatches: newTotal,
        seenPairs: newSeenPairs,
      });
      get().save();
    } catch {
      alert('Invalid JSON file');
    }
  },

  resetData() {
    set({
      songStates: createDefaultSongStates(),
      matchHistory: [],
      totalMatches: 0,
      seenPairs: new Set(),
      lastMatch: null,
      recentSongIds: [],
    });
    get().save();
  },
}));

export default useStore;
