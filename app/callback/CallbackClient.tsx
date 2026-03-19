'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const LS_DISCORD_ACCESS_TOKEN = 'discord_access_token';
const LS_DISCORD_PROFILE = 'discord_user_profile';

const LS_SPOTIFY_ACCESS_TOKEN = 'spotify_access_token';
const LS_SPOTIFY_REFRESH_TOKEN = 'spotify_refresh_token';
const LS_SPOTIFY_EXPIRES_AT = 'spotify_expires_at';

const SESSION_OAUTH_PROVIDER = 'oauth_provider';

const SESSION_DISCORD_STATE = 'discord_auth_state';

const SESSION_SPOTIFY_CODE_VERIFIER = 'spotify_code_verifier';
const SESSION_SPOTIFY_STATE = 'spotify_auth_state';
const SESSION_SPOTIFY_REDIRECT_URI = 'spotify_redirect_uri';
const SESSION_DISCORD_REDIRECT_URI = 'discord_redirect_uri';

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState('Processando callback...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const oauthError = searchParams.get('error');
        const oauthErrorDescription = searchParams.get('error_description');

        if (oauthError) {
          throw new Error(
            `OAuth error: ${oauthError}${oauthErrorDescription ? ` - ${oauthErrorDescription}` : ''}`
          );
        }
        if (!code) throw new Error('Callback: faltou o parâmetro "code".');
        if (!state) throw new Error('Callback: faltou o parâmetro "state".');

        const inferProvider = () => {
          // Se o usuário caiu no callback por outro host/porta, oauth_provider pode não existir.
          // Tentamos inferir pelo que o fluxo salva na sessão.
          if (sessionStorage.getItem(SESSION_SPOTIFY_CODE_VERIFIER) || sessionStorage.getItem(SESSION_SPOTIFY_STATE)) {
            return 'spotify';
          }
          if (sessionStorage.getItem(SESSION_DISCORD_STATE)) {
            return 'discord';
          }
          return null;
        };

        const provider = sessionStorage.getItem(SESSION_OAUTH_PROVIDER) || inferProvider();
        if (!provider) {
          throw new Error(
            'Callback: não consegui identificar qual OAuth iniciou. Volte para a home e clique em "Conectar Discord/Spotify" usando o MESMO host/porta do callback.'
          );
        }

        // Importante: redirect_uri usado na autorização precisa ser idêntico no token exchange.
        const redirectUriFromSession = sessionStorage.getItem(
          provider === 'spotify' ? SESSION_SPOTIFY_REDIRECT_URI : SESSION_DISCORD_REDIRECT_URI
        );
        const redirectUri = redirectUriFromSession || `${window.location.origin}/callback`;

        if (provider === 'discord') {
          const expectedState = sessionStorage.getItem(SESSION_DISCORD_STATE);
          if (!expectedState || state !== expectedState) {
            throw new Error('Callback Discord: state inválido (CSRF).');
          }

          setMessage('Conectando Discord...');

          const res = await fetch('/api/auth/discord/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri }),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Discord callback falhou (HTTP ${res.status}). ${text}`.trim());
          }

          const json = await res.json();

          localStorage.setItem(LS_DISCORD_ACCESS_TOKEN, json.access_token);
          localStorage.setItem(LS_DISCORD_PROFILE, JSON.stringify(json.discord_user));

          sessionStorage.removeItem(SESSION_DISCORD_STATE);
          sessionStorage.removeItem(SESSION_OAUTH_PROVIDER);
          sessionStorage.removeItem(SESSION_DISCORD_REDIRECT_URI);

          router.replace('/');
          return;
        }

        if (provider === 'spotify') {
          const expectedState = sessionStorage.getItem(SESSION_SPOTIFY_STATE);
          const codeVerifier = sessionStorage.getItem(SESSION_SPOTIFY_CODE_VERIFIER);
          if (!expectedState || !codeVerifier || state !== expectedState) {
            throw new Error('Callback Spotify: sessão PKCE inválida ou state inválido.');
          }

          setMessage('Conectando Spotify...');

          const res = await fetch('/api/auth/spotify/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, codeVerifier, redirectUri }),
          });

          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Spotify callback falhou (HTTP ${res.status}). ${text}`.trim());
          }

          const json = await res.json();

          const expiresAt = Date.now() + json.expires_in * 1000;
          localStorage.setItem(LS_SPOTIFY_ACCESS_TOKEN, json.access_token);
          if (json.refresh_token) {
            localStorage.setItem(LS_SPOTIFY_REFRESH_TOKEN, json.refresh_token);
          }
          localStorage.setItem(LS_SPOTIFY_EXPIRES_AT, String(expiresAt));

          sessionStorage.removeItem(SESSION_SPOTIFY_STATE);
          sessionStorage.removeItem(SESSION_SPOTIFY_CODE_VERIFIER);
          sessionStorage.removeItem(SESSION_OAUTH_PROVIDER);
          sessionStorage.removeItem(SESSION_SPOTIFY_REDIRECT_URI);

          router.replace('/');
          return;
        }

        throw new Error(`Callback: provider desconhecido: ${provider}`);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Erro desconhecido no callback.');
      }
    };

    run();
  }, [searchParams, router]);

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Callback OAuth</h1>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : <p>{message}</p>}
      <p style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
        Se você estiver em `http://localhost:3000`, verifique se o redirect URI do app está exatamente
        como `/callback`.
      </p>
    </div>
  );
}

