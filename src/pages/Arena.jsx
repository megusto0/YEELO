import { useState, useEffect, useCallback, useRef } from 'react';
import useStore from '../store';
import { SONGS } from '../data/songs';
import { selectMatchup } from '../logic/rankingLogic';
import SongCard from '../components/SongCard';

const PLAYABLE_COUNT = SONGS.filter(s => s.deezerId).length;

export default function Arena() {
  const songStates = useStore((s) => s.songStates);
  const totalMatches = useStore((s) => s.totalMatches);
  const seenPairs = useStore((s) => s.seenPairs);
  const recentSongIds = useStore((s) => s.recentSongIds);
  const lastMatch = useStore((s) => s.lastMatch);
  const storeMatchup = useStore((s) => s.currentMatchup);
  const recordMatch = useStore((s) => s.recordMatch);
  const undoLastMatch = useStore((s) => s.undoLastMatch);
  const setAnimating = useStore((s) => s.setAnimating);
  const queueSongId = useStore((s) => s.queueSongId);
  const setQueueSongId = useStore((s) => s.setQueueSongId);
  const setCurrentMatchup = useStore((s) => s.setCurrentMatchup);

  const [animating, setIsAnimating] = useState(false);
  const [winner, setWinner] = useState(null);
  const [eloDelta, setEloDelta] = useState(null);
  const animRef = useRef(null);

  const matchup = storeMatchup;

  const generateMatchup = useCallback(() => {
    const m = selectMatchup(songStates, totalMatches, seenPairs, recentSongIds, queueSongId);
    setQueueSongId(null);
    setCurrentMatchup(m);
    setWinner(null);
    setEloDelta(null);
  }, [songStates, totalMatches, seenPairs, recentSongIds, queueSongId, setQueueSongId, setCurrentMatchup]);

  useEffect(() => {
    if (!matchup && !animating) {
      generateMatchup();
    }
  }, [matchup, animating, generateMatchup]);

  const handlePick = useCallback(
    (side, songId) => {
      if (animating || !matchup) return;
      setIsAnimating(true);
      setAnimating(true);
      setWinner(side);

      const loserId = side === 'left' ? matchup.right : matchup.left;

      recordMatch(matchup.left, matchup.right, songId);

      const lm = useStore.getState().lastMatch;
      const winDelta =
        songId === matchup.left ? lm.newEloA - lm.eloA : lm.newEloB - lm.eloB;
      const loseDelta =
        loserId === matchup.left ? lm.newEloA - lm.eloA : lm.newEloB - lm.eloB;
      setEloDelta({ winDelta, loseDelta, winSide: side });

      animRef.current = setTimeout(() => {
        setIsAnimating(false);
        setAnimating(false);
        generateMatchup();
      }, 1500);
    },
    [animating, matchup, recordMatch, setAnimating, generateMatchup]
  );

  const handleSkip = useCallback(() => {
    if (animating) return;
    generateMatchup();
  }, [animating, generateMatchup]);

  const handleUndo = useCallback(() => {
    if (animating) return;
    undoLastMatch();
    setWinner(null);
    setEloDelta(null);
  }, [animating, undoLastMatch]);

  const handleFastClick = useCallback(() => {
    if (animRef.current) {
      clearTimeout(animRef.current);
      animRef.current = null;
    }
    setIsAnimating(false);
    setAnimating(false);
    generateMatchup();
  }, [setAnimating, generateMatchup]);

  useEffect(() => {
    const handleKey = (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') return;
      if (!matchup) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handlePick('left', matchup.left);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handlePick('right', matchup.right);
          break;
        case ' ':
        case 's':
        case 'S':
          e.preventDefault();
          handleSkip();
          break;
        case 'u':
        case 'U':
          handleUndo();
          break;
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [matchup, handlePick, handleSkip, handleUndo]);

  if (!matchup) return null;

  const ratedCount = Object.values(songStates).filter((s) => s.matches > 0).length;
  const progress = Math.round((ratedCount / PLAYABLE_COUNT) * 100);

  return (
    <div onClick={(e) => {
      if (animating && e.target.closest('.battle-container')) {
        handleFastClick();
      }
    }}>
      <div className="battle-container">
        <SongCard
          key={matchup.left}
          side="left"
          songId={matchup.left}
          songStates={songStates}
          onPick={handlePick}
          winner={winner}
          animating={animating}
          eloChange={eloDelta?.winSide === 'left' ? eloDelta.winDelta : eloDelta?.winSide !== 'left' ? eloDelta?.loseDelta : null}
          isWinner={winner === 'left'}
        />
        <div className="vs-divider">VS</div>
        <SongCard
          key={matchup.right}
          side="right"
          songId={matchup.right}
          songStates={songStates}
          onPick={handlePick}
          winner={winner}
          animating={animating}
          eloChange={eloDelta?.winSide === 'right' ? eloDelta.winDelta : eloDelta?.winSide !== 'right' ? eloDelta?.loseDelta : null}
          isWinner={winner === 'right'}
        />
      </div>

      <div className="battle-controls">
        <button onClick={handleSkip}>SKIP / DRAW</button>
        {lastMatch && <button className="undo-btn" onClick={handleUndo}>UNDO</button>}
      </div>

      <div className="battle-info">
        <span className="match-num">Match #{totalMatches + 1}</span> &nbsp;&middot;&nbsp; {ratedCount}/{PLAYABLE_COUNT} songs rated
        <span className="progress-bar">
          <span className="fill" style={{ width: `${progress}%` }}></span>
        </span>
      </div>

      {totalMatches <= 5 && (
        <div className="shortcut-hints">
          &larr; / A : Left &nbsp;&middot;&nbsp; &rarr; / D : Right &nbsp;&middot;&nbsp; Space / S : Skip &nbsp;&middot;&nbsp; U : Undo
        </div>
      )}
    </div>
  );
}
