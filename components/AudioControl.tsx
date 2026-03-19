'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioControlProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  visible: boolean;
}

export default function AudioControl({ audioRef, visible }: AudioControlProps) {
  const [isMuted, setIsMuted] = useState(false);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    setIsMuted(!isMuted);
    
    if (isMuted) {
      audioRef.current.play().catch(error => {
        console.log('Error resuming music:', error);
      });
    } else {
      audioRef.current.pause();
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`audio-control ${visible ? 'visible' : ''} ${isMuted ? 'muted' : ''}`}
      onClick={toggleAudio}
    >
      <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`} id="audio-icon"></i>
    </div>
  );
}

