import useStore from '../store';
import './Onboarding.css';

export default function Onboarding() {
  const onboarded = useStore((s) => s.onboarded);
  const dismissOnboarding = useStore((s) => s.dismissOnboarding);

  if (onboarded) return null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding">
        <h1>
          RANK EVERY
          <br />
          KANYE SONG
        </h1>
        <p>1v1 matchups. Pick your winner. Watch the rankings evolve.</p>
        <div className="steps">
          <div>
            <span>Step 1:</span> Listen to both songs via Deezer preview
          </div>
          <div>
            <span>Step 2:</span> Click your pick
          </div>
          <div>
            <span>Step 3:</span> Rankings update in real time
          </div>
        </div>
        <button className="start-btn" onClick={dismissOnboarding}>
          START
        </button>
      </div>
    </div>
  );
}
