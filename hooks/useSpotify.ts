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

const LS_ACCESS_TOKEN = 'spotify_access_token';
const LS_REFRESH_TOKEN = 'spotify_refresh_token';
const LS_EXPIRES_AT = 'spotify_expires_at';

const SESSION_CODE_VERIFIER = 'spotify_code_verifier';
const SESSION_AUTH_STATE = 'spotify_auth_state';
const SESSION_REDIRECT_URI = 'spotify_redirect_uri';

function randomString(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64UrlEncode(arrayBuffer: ArrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Base64Url(value: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

export function useSpotify() {
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastPlayingAtRef = useRef<number | null>(null);
  const [tokenVersion, setTokenVersion] = useState(0);

  const clearTokens = () => {
    localStorage.removeItem(LS_ACCESS_TOKEN);
    localStorage.removeItem(LS_REFRESH_TOKEN);
    localStorage.removeItem(LS_EXPIRES_AT);
  };

  const getStoredTokens = () => {
    const accessToken = localStorage.getItem(LS_ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(LS_REFRESH_TOKEN);
    const expiresAtRaw = localStorage.getItem(LS_EXPIRES_AT);
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;
    return { accessToken, refreshToken, expiresAt };
  };

  const refreshAccessToken = async () => {
    const { refreshToken } = getStoredTokens();
    const clientId = CONFIG.SPOTIFY_CLIENT_ID;
    if (!refreshToken || !clientId) return null;

    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
    body.set('client_id', clientId);

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const json = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    const expiresAt = Date.now() + json.expires_in * 1000;
    localStorage.setItem(LS_ACCESS_TOKEN, json.access_token);
    localStorage.setItem(LS_EXPIRES_AT, String(expiresAt));
    if (json.refresh_token) {
      localStorage.setItem(LS_REFRESH_TOKEN, json.refresh_token);
    }

    return json.access_token;
  };

  const getValidAccessToken = async () => {
    const { accessToken, refreshToken, expiresAt } = getStoredTokens();

    // FIX: aceita o token se ainda não expirou (sem margem de 60s que descartava tokens válidos)
    // Só tenta refresh se tiver menos de 5 minutos restantes
    if (accessToken) {
      if (!expiresAt || expiresAt > Date.now() + 5 * 60_000) {
        // Token válido com folga — usa direto
        return accessToken;
      }
      // Token perto de expirar — tenta refresh
      if (refreshToken) {
        const newToken = await refreshAccessToken();
        return newToken ?? accessToken; // se refresh falhar, usa o atual enquanto válido
      }
      // Sem refresh token (comum no PKCE primeira autenticação) — usa o token enquanto válido
      if (expiresAt > Date.now()) {
        return accessToken;
      }
    }

    if (refreshToken) {
      return refreshAccessToken();
    }

    return null;
  };

  const connectSpotify = async () => {
    try {
      const clientId = CONFIG.SPOTIFY_CLIENT_ID;
      if (!clientId) {
        setError('Faltando SPOTIFY_CLIENT_ID na config.');
        return;
      }

      const redirectUri = CONFIG.SPOTIFY_REDIRECT_URI;
      const state = randomString(16);
      const codeVerifier = randomString(64);
      const codeChallenge = await sha256Base64Url(codeVerifier);

      sessionStorage.setItem('oauth_provider', 'spotify');
      sessionStorage.setItem(SESSION_CODE_VERIFIER, codeVerifier);
      sessionStorage.setItem(SESSION_AUTH_STATE, state);
      sessionStorage.setItem(SESSION_REDIRECT_URI, redirectUri);

      const scope = 'user-read-currently-playing user-read-playback-state';

      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('code_challenge', codeChallenge);

      window.location.href = authUrl.toString();
    } catch (e) {
      console.error(e);
      setError('Erro ao iniciar autenticação do Spotify.');
    }
  };

  // FIX: chama a API route do Next.js — NUNCA chame a Spotify API diretamente do browser
  // (o CORS bloqueia). A rota /api/spotify/currently-playing proxy a chamada pelo servidor.
  // IMPORTANTE: isso só funciona rodando `next dev` (porta 3000), não no Live Server (5500).
  const fetchCurrentlyPlaying = async (accessToken: string) => {
    const res = await fetch('/api/spotify/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 204) return null;

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Spotify currently-playing falhou (HTTP ${res.status}). ${text}`.trim());
    }

    return (await res.json()) as SpotifyData;
  };

  // storage event — detecta token salvo em OUTRA aba
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LS_ACCESS_TOKEN && e.newValue) {
        setTokenVersion((v) => v + 1);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // visibilitychange — quando a aba volta a ficar visível após redirect OAuth na MESMA aba
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const token = localStorage.getItem(LS_ACCESS_TOKEN);
        if (token) {
          setTokenVersion((v) => v + 1);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const tick = async () => {
      try {
        setError(null);

        const accessToken = await getValidAccessToken();
        if (!accessToken) {
          setSpotifyData(null);
          setError('Conecte o Spotify para exibir a música tocando agora.');
          return;
        }

        const playing = await fetchCurrentlyPlaying(accessToken);
        if (!playing) {
          const keepAliveMs = 10_000;
          if (lastPlayingAtRef.current && Date.now() - lastPlayingAtRef.current < keepAliveMs) {
            setError('Sincronizando...');
            return;
          }
          setSpotifyData(null);
          setError(
            'Nenhuma música tocando agora. Abra o Spotify e dê play (pode exigir Premium, dispositivo ativo e sessão NÃO privada).'
          );
          return;
        }

        setSpotifyData(playing);
        lastPlayingAtRef.current = Date.now();
        setError(null);
      } catch (e) {
        console.error(e);
        setSpotifyData(null);

        const msg = e instanceof Error ? e.message : 'Erro ao buscar Spotify.';
        if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
          clearTokens();
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    tick();
    const intervalId = window.setInterval(tick, CONFIG.SPOTIFY_UPDATE_INTERVAL);
    return () => window.clearInterval(intervalId);
  }, [tokenVersion]);

  return { spotifyData, loading, error, connectSpotify };
}