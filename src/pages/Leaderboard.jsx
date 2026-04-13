import { useMemo } from 'react';
import useStore from '../store';
import { SONGS, SONG_MAP, ALBUM_INFO, ALBUM_COLORS } from '../data/songs';
import { getConfidence } from '../logic/rankingLogic';
import Sparkline from '../components/Sparkline';
import './Leaderboard.css';

export default function Leaderboard() {
  const songStates = useStore((s) => s.songStates);
  const matchHistory = useStore((s) => s.matchHistory);
  const songFilter = useStore((s) => s.songFilter);
  const songAlbumFilter = useStore((s) => s.songAlbumFilter);
  const songSort = useStore((s) => s.songSort);
  const expandedSong = useStore((s) => s.expandedSong);
  const setSongFilter = useStore((s) => s.setSongFilter);
  const setSongAlbumFilter = useStore((s) => s.setSongAlbumFilter);
  const setSongSort = useStore((s) => s.setSongSort);
  const setExpandedSong = useStore((s) => s.setExpandedSong);
  const setQueueSongId = useStore((s) => s.setQueueSongId);
  const setTab = useStore((s) => s.setTab);

  const songs = useMemo(() => {
    let list = SONGS.map((s) => ({ song: s, ss: songStates[s.id] }));

    if (songFilter) {
      const q = songFilter.toLowerCase();
      list = list.filter((x) => x.song.title.toLowerCase().includes(q));
    }
    if (songAlbumFilter) {
      list = list.filter((x) => x.song.album === songAlbumFilter);
    }

    const ranked = list.filter((x) => x.ss.matches > 0);
    const unranked = list.filter((x) => x.ss.matches === 0);

    ranked.sort((a, b) => {
      if (songSort === 'elo') {
        if (b.ss.elo !== a.ss.elo) return b.ss.elo - a.ss.elo;
        if (a.ss.rd !== b.ss.rd) return a.ss.rd - b.ss.rd;
        const wrA = a.ss.matches > 0 ? a.ss.wins / a.ss.matches : 0;
        const wrB = b.ss.matches > 0 ? b.ss.wins / b.ss.matches : 0;
        if (wrB !== wrA) return wrB - wrA;
        return a.song.title.localeCompare(b.song.title);
      } else if (songSort === 'winrate') {
        const wrA = a.ss.matches > 0 ? a.ss.wins / a.ss.matches : 0;
        const wrB = b.ss.matches > 0 ? b.ss.wins / b.ss.matches : 0;
        return wrB - wrA;
      } else {
        return b.ss.matches - a.ss.matches;
      }
    });

    return { ranked, unranked };
  }, [songStates, songFilter, songAlbumFilter, songSort, matchHistory]);

  const handleBattleNext = (songId) => {
    setQueueSongId(songId);
    setTab('battle');
  };

  return (
    <div className="leaderboard">
      <h2 style={{ marginBottom: 20 }}>SONG RANKINGS</h2>

      <div className="controls">
        <input
          type="text"
          placeholder="Search songs..."
          value={songFilter}
          onChange={(e) => setSongFilter(e.target.value)}
        />
        <select value={songAlbumFilter} onChange={(e) => setSongAlbumFilter(e.target.value)}>
          <option value="">All Albums</option>
          {ALBUM_INFO.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} ({a.year})
            </option>
          ))}
        </select>
        <div className="sort-btns">
          {[
            ['elo', 'ELO'],
            ['winrate', 'WIN RATE'],
            ['matches', 'MATCHES'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={songSort === key ? 'active' : ''}
              onClick={() => setSongSort(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {songs.ranked.map((x, i) => {
        const conf = getConfidence(x.ss.rd, x.ss.matches);
        const color = ALBUM_COLORS[x.song.album];
        const albumTitle = ALBUM_INFO.find((a) => a.id === x.song.album).title;
        const isExpanded = expandedSong === x.song.id;

        return (
          <div key={x.song.id}>
            <div className="song-row" onClick={() => setExpandedSong(isExpanded ? null : x.song.id)}>
              <div className="rank">{i + 1}</div>
              <div className="song-info">
                <div className="song-title">{x.song.title}</div>
                <div className="song-album">
                  <span className="color-dot" style={{ background: color }} />
                  {albumTitle}
                </div>
              </div>
              <div className="elo">{x.ss.elo}</div>
              <div className="record">
                {x.ss.wins}-{x.ss.losses}
              </div>
              <div className={`confidence ${conf.cls}`}>{conf.text}</div>
            </div>

            {isExpanded && (
              <div className="song-detail">
                <div>
                  Record: {x.ss.wins}W - {x.ss.losses}L | RD: {Math.round(x.ss.rd)}
                </div>

                {x.ss.eloHistory.length > 1 && <Sparkline data={x.ss.eloHistory} />}

                <MatchHistoryList songId={x.song.id} matchHistory={matchHistory} />

                <button className="battle-next-btn" onClick={() => handleBattleNext(x.song.id)}>
                  BATTLE THIS SONG NEXT
                </button>
              </div>
            )}
          </div>
        );
      })}

      {songs.unranked.length > 0 && (
        <div className="unranked-section">
          <h3>UNRANKED ({songs.unranked.length})</h3>
          {songs.unranked.map((x) => {
            const color = ALBUM_COLORS[x.song.album];
            const albumTitle = ALBUM_INFO.find((a) => a.id === x.song.album).title;
            return (
              <div key={x.song.id} className="song-row" onClick={() => setExpandedSong(expandedSong === x.song.id ? null : x.song.id)}>
                <div className="rank" style={{ color: '#222' }}>
                  -
                </div>
                <div className="song-info">
                  <div className="song-title">{x.song.title}</div>
                  <div className="song-album">
                    <span className="color-dot" style={{ background: color }} />
                    {albumTitle}
                  </div>
                </div>
                <div className="elo" style={{ color: '#333' }}>
                  1500
                </div>
                <div className="record">0-0</div>
                <div className="confidence unranked">UNRANKED</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatchHistoryList({ songId, matchHistory }) {
  const history = matchHistory
    .filter((m) => m.song1 === songId || m.song2 === songId)
    .slice(-10)
    .reverse();

  if (!history.length) return null;

  return (
    <div className="history-list">
      {history.map((h, i) => {
        const oppId = h.song1 === songId ? h.song2 : h.song1;
        const opp = SONG_MAP[oppId];
        const won = h.winner === songId;
        const oldElo = h.song1 === songId ? h.eloChanges.a : h.eloChanges.b;
        const newElo = h.song1 === songId ? h.eloChanges.newA : h.eloChanges.newB;
        return (
          <div key={i} className="history-item">
            {won ? 'W' : 'L'} vs {opp?.title || '?'} ({oldElo} &rarr; {newElo})
          </div>
        );
      })}
    </div>
  );
}
