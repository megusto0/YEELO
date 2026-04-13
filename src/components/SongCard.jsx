import { useRef, useState, useCallback, useEffect } from 'react';
import { SONG_MAP, ALBUM_INFO, ALBUM_COLORS } from '../data/songs';
import './SongCard.css';

const previewCache = {};

async function fetchPreviewUrl(song) {
  if (previewCache[song.id]) return previewCache[song.id];
  if (!song.deezerId) return null;
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(`https://api.deezer.com/track/${song.deezerId}`)}`;
    const res = await fetch(proxyUrl);
    const data = await res.json();
    const url = data?.preview || null;
    previewCache[song.id] = url;
    return url;
  } catch {
    return null;
  }
}

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

export default function SongCard({ side, songId, songStates, onPick, winner, animating, eloChange, isWinner }) {
  const song = SONG_MAP[songId];
  const color = ALBUM_COLORS[song.album];
  const album = ALBUM_INFO.find((a) => a.id === song.album);
  const audioRef = useRef(null);
  const seekRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasAudio, setHasAudio] = useState(song.deezerId != null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  const handleClick = (e) => {
    if (animating) return;
    onPick(side, songId);
  };

  const togglePlay = useCallback(async (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    if (!audio.src || audio.src === window.location.href) {
      setLoading(true);
      const url = await fetchPreviewUrl(song);
      setLoading(false);
      if (!url) {
        setHasAudio(false);
        return;
      }
      audio.src = url;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, [playing, song]);

  const handleEnded = () => setPlaying(false);

  const handleTimeUpdate = () => {
    if (seeking) return;
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) setDuration(audio.duration || 0);
  };

  const handleSeekStart = (e) => {
    e.stopPropagation();
    setSeeking(true);
  };

  const handleSeekMove = (e) => {
    const bar = seekRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !duration) return;
    const rect = bar.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    setCurrentTime(pct * duration);
  };

  const handleSeekEnd = () => {
    const audio = audioRef.current;
    if (audio && duration) {
      audio.currentTime = currentTime;
    }
    setSeeking(false);
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  let borderClass = '';
  let opacity = 1;
  if (winner && animating) {
    if (isWinner) {
      borderClass = 'winner-flash';
    } else {
      opacity = 0.4;
    }
  }

  return (
    <div
      className={`song-card ${borderClass}`}
      style={{ opacity }}
      onClick={handleClick}
    >
      <div className="card-strip" style={{ background: color }} />
      <div className="card-body">
        <div className="card-title">{song.title}</div>
        <div className="card-album">{album.title} ({song.albumYear})</div>
        {hasAudio ? (
          <div className="audio-wrap" onClick={(e) => e.stopPropagation()}>
            <audio
              ref={audioRef}
              preload="none"
              onEnded={handleEnded}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
            <button className="play-btn" onClick={togglePlay}>
              {loading ? '[ ... ]' : playing ? '[ STOP ]' : '[ PLAY ]'}
            </button>
            <div
              ref={seekRef}
              className="seek-bar"
              onMouseDown={handleSeekStart}
              onMouseMove={(e) => seeking && handleSeekMove(e)}
              onMouseUp={handleSeekEnd}
              onMouseLeave={() => seeking && handleSeekEnd()}
              onTouchStart={handleSeekStart}
              onTouchMove={(e) => seeking && handleSeekMove(e)}
              onTouchEnd={handleSeekEnd}
            >
              <div className="seek-fill" style={{ width: pct + '%' }} />
              <div className="seek-thumb" style={{ left: pct + '%' }} />
            </div>
            <div className="seek-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        ) : (
          <div className="no-preview">NO PREVIEW AVAILABLE</div>
        )}
      </div>
      {animating && eloChange != null && (
        <div className={`elo-flash ${eloChange > 0 ? 'positive' : 'negative'}`}>
          {eloChange > 0 ? '+' : ''}{eloChange}
        </div>
      )}
    </div>
  );
}
