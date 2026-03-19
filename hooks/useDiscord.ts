'use client';

import { useState, useEffect } from 'react';
import { CONFIG } from '@/lib/config';

export interface DiscordUser {
  discord_user: {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
    discriminator: string;
    bio?: string;
  };
  discord_status: 'online' | 'idle' | 'dnd' | 'offline';
  activities: Array<{
    type: number;
    name: string;
    state?: string;
    emoji?: {
      name: string;
    };
  }>;
}

export function useDiscord() {
  const [discordData, setDiscordData] = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setError(null);

        const accessToken = localStorage.getItem('discord_access_token');
        if (!accessToken) {
          setDiscordData(null);
          setLoading(false);
          return;
        }

        // Cache local (evita nova chamada imediata após callback).
        const cached = localStorage.getItem('discord_user_profile');
        if (cached) {
          try {
            const cachedUser = JSON.parse(cached) as DiscordUser['discord_user'];
            setDiscordData({
              discord_user: cachedUser,
              discord_status: 'online',
              activities: [],
            });
          } catch {
            // ignora cache inválido
          }
        }

        const response = await fetch('/api/auth/discord/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          setError(text || `Falha ao buscar Discord (HTTP ${response.status}).`);
          setDiscordData(null);
          return;
        }

        const data = (await response.json()) as DiscordUser;
        setDiscordData(data);
        setError(null);
      } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
          localStorage.removeItem('discord_access_token');
          localStorage.removeItem('discord_user_profile');
          setDiscordData(null);
        }

        setError('Erro ao buscar Discord. Veja o console para detalhes.');
        console.log('Error fetching Discord data:', error);
        setDiscordData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const connectDiscord = () => {
    const clientId = CONFIG.DISCORD_OAUTH_CLIENT_ID;
    if (!clientId) {
      setError('Faltando DISCORD_OAUTH_CLIENT_ID na config.');
      return;
    }

    const redirectUri = `${window.location.origin}/callback`;
    const state = `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;

    sessionStorage.setItem('oauth_provider', 'discord');
    sessionStorage.setItem('discord_auth_state', state);
    sessionStorage.setItem('discord_redirect_uri', redirectUri);

    const scope = CONFIG.DISCORD_OAUTH_SCOPE || 'identify';

    const authUrl = new URL('https://discord.com/api/oauth2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    window.location.href = authUrl.toString();
  };

  return { discordData, loading, error, connectDiscord };
}

