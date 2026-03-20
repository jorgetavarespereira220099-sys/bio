'use client';

import { useEffect, useState, useRef } from 'react';
import { CONFIG } from '@/lib/config';

export interface SpotifyData {
  song: string;
  artist: string;
  album_art_url: string;
  timestamps: {
    start: number;
    end: number;
  };
}

export function useSpotify() {
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastPlayingAtRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = async () => {
      try {
        setError(null);

        // Sem OAuth, sem localStorage — o servidor gerencia o token via refresh token fixo
        const res = await fetch('/api/spotify/currently-playing', {
          cache: 'no-store',
        });

        if (res.status === 204) {
          const keepAliveMs = 10_000;
          if (lastPlayingAtRef.current && Date.now() - lastPlayingAtRef.current < keepAliveMs) {
            return;
          }
          setSpotifyData(null);
          setError('Nenhuma música tocando agora.');
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Spotify falhou (HTTP ${res.status}). ${text}`.trim());
        }

        const data = (await res.json()) as SpotifyData;
        setSpotifyData(data);
        lastPlayingAtRef.current = Date.now();
        setError(null);
      } catch (e) {
        console.error(e);
        setSpotifyData(null);
        setError(e instanceof Error ? e.message : 'Erro ao buscar Spotify.');
      } finally {
        setLoading(false);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, CONFIG.SPOTIFY_UPDATE_INTERVAL);
    return () => window.clearInterval(intervalId);
  }, []);

  // connectSpotify mantido para não quebrar imports, mas não faz nada
  const connectSpotify = () => {};

  return { spotifyData, loading, error, connectSpotify };
}