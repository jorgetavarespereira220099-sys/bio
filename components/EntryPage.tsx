'use client';

import { useState } from 'react';

interface EntryPageProps {
  onEnter: () => void;
}

export default function EntryPage({ onEnter }: EntryPageProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleEnter = () => {
    setIsFadingOut(true);
    const audio = document.getElementById('background-music') as HTMLAudioElement;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(error => {
        console.log('Error starting music:', error);
      });
    }
    setTimeout(() => {
      onEnter();
    }, 800);
  };

  return (
    <div className={`entry-page ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="entry-container">
        <div className="entry-text" onClick={handleEnter}>
          Click to Enter
        </div>
      </div>
    </div>
  );
}

export { EntryPage };

