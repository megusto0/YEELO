import { useMemo } from 'react';
import useStore from '../store';
import { SONGS, ALBUM_INFO, ALBUM_COLORS } from '../data/songs';
import { computeAlbumScore, getAlbumConfidence } from '../logic/rankingLogic';
import './AlbumRankings.css';

export default function AlbumRankings() {
  const songStates = useStore((s) => s.songStates);
  const expandedAlbum = useStore((s) => s.expandedAlbum);
  const setExpandedAlbum = useStore((s) => s.setExpandedAlbum);

  const { ranked, unranked } = useMemo(() => {
    const scores = ALBUM_INFO.map((a) => ({
      album: a,
      score: computeAlbumScore(songStates, a.id),
    }));

    return {
      ranked: scores
        .filter((x) => x.score !== null)
        .sort((a, b) => b.score.composite - a.score.composite),
      unranked: scores.filter((x) => x.score === null),
    };
  }, [songStates]);

  return (
    <div className="albums-page">
      <h2 style={{ marginBottom: 20 }}>ALBUM RANKINGS</h2>

      {ranked.map((x, i) => {
        const a = x.album;
        const sc = x.score;
        const color = ALBUM_COLORS[a.id];
        const conf = getAlbumConfidence(sc.ratedCount, sc.totalCount);
        const isExpanded = expandedAlbum === a.id;
        const peakTitle = sc.peakSong?.title || '-';

        return (
          <div key={a.id}>
            <div
              className="album-row"
              onClick={() => setExpandedAlbum(isExpanded ? null : a.id)}
            >
              <div className="album-strip" style={{ background: color }} />
              <div className="rank">{i + 1}</div>
              <div className="album-info">
                <div className="album-name">{a.title}</div>
                <div className="album-year">{a.year}</div>
              </div>
              <div className="composite">{sc.composite}</div>
              <div className="peak-song">
                {peakTitle} ({sc.peakElo})
              </div>
              <div className="avg-elo">{sc.rawAvg}</div>
              <div className="songs-rated">
                {sc.ratedCount}/{sc.totalCount}{' '}
                <span className={`confidence ${conf.cls}`}>{conf.text}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="album-detail">
                <div className="album-meta">
                  Composite: {sc.composite} | Raw Avg: {sc.rawAvg} | Peak boost:{' '}
                  {sc.composite - sc.rawAvg > 0 ? '+' : ''}
                  {sc.composite - sc.rawAvg}
                </div>
                {sc.songs.map((s) => {
                  const ss = songStates[s.id];
                  return (
                    <div key={s.id} className="album-song">
                      <span className="as-title">{s.title}</span>
                      <span className="as-elo">
                        {ss.elo} ({ss.wins}-{ss.losses}, RD:{Math.round(ss.rd)})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {unranked.length > 0 && (
        <div className="unranked-section">
          <h3>UNRANKED</h3>
          {unranked.map((x) => {
            const a = x.album;
            const color = ALBUM_COLORS[a.id];
            const total = SONGS.filter((s) => s.album === a.id).length;
            return (
              <div
                key={a.id}
                className="album-row"
                onClick={() => setExpandedAlbum(expandedAlbum === a.id ? null : a.id)}
              >
                <div className="album-strip" style={{ background: color }} />
                <div className="rank" style={{ color: '#222' }}>
                  -
                </div>
                <div className="album-info">
                  <div className="album-name">{a.title}</div>
                  <div className="album-year">{a.year}</div>
                </div>
                <div className="composite" style={{ color: '#333' }}>
                  -
                </div>
                <div className="peak-song" />
                <div className="avg-elo" />
                <div className="songs-rated">
                  0/{total} <span className="confidence unranked">UNRANKED</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
