'use client';

// app/callback/page.tsx
// FIX Bug 1: Esta página é OBRIGATÓRIA para o OAuth PKCE funcionar.
// O Spotify/Discord redireciona o usuário de volta para /callback?code=...
// e este componente troca o code pelo access_token.

import { useEffect, useState } from 'react';
import { CONFIG } from '@/lib/config';

export default function CallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      // Usuário cancelou a autorização
      if (error) {
        setStatus('error');
        setMessage(`Autorização negada: ${error}`);
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Código de autorização não encontrado.');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        return;
      }

      const provider = sessionStorage.getItem('oauth_provider');

      // ── SPOTIFY ──────────────────────────────────────────────────────────────
      if (provider === 'spotify') {
        const savedState = sessionStorage.getItem('spotify_auth_state');
        const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
        const redirectUri = sessionStorage.getItem('spotify_redirect_uri');

        if (!codeVerifier || !redirectUri) {
          setStatus('error');
          setMessage('Sessão expirada. Tente conectar o Spotify novamente.');
          setTimeout(() => { window.location.href = '/'; }, 2000);
          return;
        }

        // Valida state para prevenir CSRF
        if (savedState && state !== savedState) {
          setStatus('error');
          setMessage('Falha de segurança: state não confere. Tente novamente.');
          setTimeout(() => { window.location.href = '/'; }, 2000);
          return;
        }

        try {
          setMessage('Trocando código pelo token do Spotify...');

          const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: CONFIG.SPOTIFY_CLIENT_ID,
            code_verifier: codeVerifier,
          });

          const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({})) as { error?: string; error_description?: string };
            throw new Error(errJson.error_description || errJson.error || `HTTP ${res.status}`);
          }

          const json = await res.json() as {
            access_token: string;
            refresh_token: string;
            expires_in: number;
          };

          localStorage.setItem('spotify_access_token', json.access_token);
          localStorage.setItem('spotify_refresh_token', json.refresh_token);
          localStorage.setItem('spotify_expires_at', String(Date.now() + json.expires_in * 1000));

          // Limpa sessionStorage
          sessionStorage.removeItem('oauth_provider');
          sessionStorage.removeItem('spotify_code_verifier');
          sessionStorage.removeItem('spotify_auth_state');
          sessionStorage.removeItem('spotify_redirect_uri');

          setStatus('success');
          setMessage('Spotify conectado! Redirecionando...');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
          setStatus('error');
          setMessage(`Falha ao obter token do Spotify: ${msg}`);
        }

        setTimeout(() => { window.location.href = '/'; }, 1500);
        return;
      }

      // ── DISCORD ──────────────────────────────────────────────────────────────
      if (provider === 'discord') {
        const savedState = sessionStorage.getItem('discord_auth_state');
        const redirectUri = sessionStorage.getItem('discord_redirect_uri');

        if (!redirectUri) {
          setStatus('error');
          setMessage('Sessão expirada. Tente conectar o Discord novamente.');
          setTimeout(() => { window.location.href = '/'; }, 2000);
          return;
        }

        if (savedState && state !== savedState) {
          setStatus('error');
          setMessage('Falha de segurança: state não confere. Tente novamente.');
          setTimeout(() => { window.location.href = '/'; }, 2000);
          return;
        }

        try {
          setMessage('Trocando código pelo token do Discord...');

          // A troca pelo token do Discord requer client_secret, então vai via API route
          // para não expor a secret no client.
          const res = await fetch('/api/auth/discord/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri }),
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(errJson.error || `HTTP ${res.status}`);
          }

          const json = await res.json() as { access_token: string };

          localStorage.setItem('discord_access_token', json.access_token);

          // Limpa sessionStorage
          sessionStorage.removeItem('oauth_provider');
          sessionStorage.removeItem('discord_auth_state');
          sessionStorage.removeItem('discord_redirect_uri');

          setStatus('success');
          setMessage('Discord conectado! Redirecionando...');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro desconhecido';
          setStatus('error');
          setMessage(`Falha ao obter token do Discord: ${msg}`);
        }

        setTimeout(() => { window.location.href = '/'; }, 1500);
        return;
      }

      // Provider desconhecido
      setStatus('error');
      setMessage('Provider OAuth desconhecido. Redirecionando...');
      setTimeout(() => { window.location.href = '/'; }, 2000);
    };

    handleCallback();
  }, []);

  const iconMap = {
    loading: '⏳',
    success: '✅',
    error: '❌',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        background: 'var(--bg-primary, #0a0a0a)',
        color: 'var(--text-primary, #ffffff)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ fontSize: '48px' }}>{iconMap[status]}</div>
      <p style={{ fontSize: '16px', color: 'var(--text-secondary, #aaaaaa)', textAlign: 'center', maxWidth: 360 }}>
        {message}
      </p>
    </div>
  );
}