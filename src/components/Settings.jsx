import { useRef } from 'react';
import useStore from '../store';
import './Settings.css';

export default function Settings() {
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetData = useStore((s) => s.resetData);
  const fileRef = useRef(null);

  if (!settingsOpen) return null;

  const handleImport = () => {
    const mode = prompt('Import mode: type "replace" to replace all data, or "merge" to merge.');
    if (mode !== 'replace' && mode !== 'merge') return;
    if (fileRef.current) {
      fileRef.current.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => importData(ev.target.result, mode);
        reader.readAsText(file);
      };
      fileRef.current.click();
    }
  };

  const handleReset = () => {
    if (!confirm('This will erase all your rankings. Are you sure?')) return;
    resetData();
    setSettingsOpen(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSettingsOpen(false)}>
      <div className="modal">
        <button className="close-btn" onClick={() => setSettingsOpen(false)}>
          &times;
        </button>
        <h2>SETTINGS</h2>

        <div className="section">
          <h3>DATA</h3>
          <button className="action-btn" onClick={exportData}>
            EXPORT DATA
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} />
          <button className="action-btn" onClick={handleImport}>
            IMPORT DATA
          </button>
          <button className="action-btn danger" onClick={handleReset}>
            RESET ALL DATA
          </button>
        </div>

        <div className="section">
          <h3>KEYBOARD SHORTCUTS</h3>
          <div className="shortcut-list">
            <div><span>Pick left</span><kbd>&larr;</kbd> or <kbd>A</kbd></div>
            <div><span>Pick right</span><kbd>&rarr;</kbd> or <kbd>D</kbd></div>
            <div><span>Skip / Draw</span><kbd>Space</kbd> or <kbd>S</kbd></div>
            <div><span>Undo</span><kbd>U</kbd></div>
          </div>
        </div>
      </div>
    </div>
  );
}
