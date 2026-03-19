'use client';

import { useSpotify } from '@/hooks/useSpotify';
import { useState, useEffect } from 'react';
import { formatTime } from '@/lib/utils';

export default function SpotifyWidget() {
  const { spotifyData, error, connectSpotify } = useSpotify();
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

  useEffect(() => {
    if (!spotifyData) return;

    const updateProgress = () => {
      const now = Date.now();
      const start = spotifyData.timestamps.start;
      const end = spotifyData.timestamps.end;
      
      const progressValue = ((now - start) / (end - start)) * 100;
      const clampedProgress = Math.min(Math.max(progressValue, 0), 100);
      
      setProgress(clampedProgress);
      setCurrentTime(Math.max(0, now - start));
      setTotalTime(end - start);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000);

    return () => clearInterval(interval);
  }, [spotifyData]);

  return (
    <div className="widget spotify-widget">
      <div className="widget-header">
        <div className="widget-icon">
          <i className="fab fa-spotify"></i>
        </div>
        <span className="widget-title">Spotify</span>
        <div className="playback-status">
          <div className={`play-indicator ${spotifyData ? 'playing' : ''}`}></div>
        </div>
      </div>
      <div className="widget-content">
        <div className="spotify-info">
          <div className="track-details">
            <span className="track-name">
              {spotifyData?.song || (error ? error : 'Not playing')}
            </span>
            <span className="artist-name">
              {spotifyData?.artist || '-'}
            </span>
          </div>
          {!spotifyData && (
            <button
              onClick={connectSpotify}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid var(--border-secondary)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Conectar Spotify
            </button>
          )}
          {spotifyData && (
            <div className="album-container">
              <img
                src={spotifyData.album_art_url}
                alt="Album Art"
                className="album-art visible"
              />
            </div>
          )}
        </div>
        {spotifyData && (
          <div className="progress-container visible">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="time-info">
              <span className="current-time">{formatTime(currentTime)}</span>
              <span className="total-time">{formatTime(totalTime)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

