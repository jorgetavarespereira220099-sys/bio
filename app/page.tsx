'use client';

import { useState, useRef, useEffect } from 'react';
import Cursor from '@/components/Cursor';
import EntryPage from '@/components/EntryPage';
import AudioControl from '@/components/AudioControl';
import DiscordWidget from '@/components/DiscordWidget';
import SpotifyWidget from '@/components/SpotifyWidget';
import ProfileCard from '@/components/ProfileCard';

export default function Home() {
  const [hasEntered, setHasEntered] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <>
      <Cursor />
      <audio
        ref={audioRef}
        id="background-music"
        loop
        preload="auto"
      >
        <source src="/background-music.mp3" type="audio/mpeg" />
        Your browser does not support HTML5 audio.
      </audio>
      {!hasEntered && <EntryPage onEnter={() => setHasEntered(true)} />}
      {hasEntered && (
        <>
          <AudioControl audioRef={audioRef} visible={hasEntered} />
          <div className="main-site">
            <div className="particles-container">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="particle"></div>
              ))}
            </div>
            
            <div className="ambient-overlay"></div>
            
            <div className="main-container">
              <div className="widgets-section">
                <DiscordWidget />
                <SpotifyWidget />
              </div>
              
              <div className="profile-section">
                <ProfileCard />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
