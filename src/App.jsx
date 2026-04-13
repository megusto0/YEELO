import useStore from './store';
import Arena from './pages/Arena';
import Leaderboard from './pages/Leaderboard';
import AlbumRankings from './pages/AlbumRankings';
import Settings from './components/Settings';
import Onboarding from './components/Onboarding';
import './App.css';

function App() {
  const currentTab = useStore((s) => s.currentTab);
  const setTab = useStore((s) => s.setTab);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const onboarded = useStore((s) => s.onboarded);

  return (
    <div className="app-layout">
      <nav className="top-nav">
        {['battle', 'songs', 'albums'].map((t) => (
          <button
            key={t}
            className={`tab ${currentTab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
        <button className="gear-btn" onClick={() => setSettingsOpen(true)}>
          &#9881;
        </button>
      </nav>

      <main>
        {currentTab === 'battle' && <Arena />}
        {currentTab === 'songs' && <Leaderboard />}
        {currentTab === 'albums' && <AlbumRankings />}
      </main>

      <nav className="bottom-nav" style={{ display: 'none' }}>
        {['battle', 'songs', 'albums'].map((t) => (
          <button
            key={t}
            className={`tab ${currentTab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
        <button className="tab" onClick={() => setSettingsOpen(true)}>
          &#9881;
        </button>
      </nav>

      <Settings />
      {!onboarded && <Onboarding />}
    </div>
  );
}

export default App;
