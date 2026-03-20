'use client';

import { useState, useEffect, useRef } from 'react';

const texts = [
  'full-stack engineer',
  'idea builder',
  'tech minimalist',
  'systems engineer'
];

export default function TypingEffect() {
  const [displayText, setDisplayText] = useState('');
  const textIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const isDeletingRef = useRef(false);

  useEffect(() => {
    const typeWriter = () => {
      const currentText = texts[textIndexRef.current];
      
      if (isDeletingRef.current) {
        if (charIndexRef.current > 0) {
          charIndexRef.current--;
          setDisplayText(currentText.substring(0, charIndexRef.current));
          setTimeout(typeWriter, 50);
        } else {
          isDeletingRef.current = false;
          textIndexRef.current = (textIndexRef.current + 1) % texts.length;
          setTimeout(typeWriter, 500);
        }
      } else {
        if (charIndexRef.current < currentText.length) {
          charIndexRef.current++;
          setDisplayText(currentText.substring(0, charIndexRef.current));
          setTimeout(typeWriter, 100);
        } else {
          isDeletingRef.current = true;
          setTimeout(typeWriter, 2000);
        }
      }
    };

    const timer = setTimeout(typeWriter, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <p className="bio-text">
      <span className="typing-text">{displayText}</span>
      <span className="cursor-blink">|</span>
    </p>
  );
}

