'use client';

import { useState, useEffect } from 'react';

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
    emoji?: { name: string };
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

        // Sem OAuth, sem localStorage — chama direto o servidor que usa o bot token fixo
        const response = await fetch('/api/auth/discord/me', {
          cache: 'no-store',
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          setError(`Falha ao buscar Discord (HTTP ${response.status}). ${text}`.trim());
          setDiscordData(null);
          return;
        }

        const data = (await response.json()) as DiscordUser;
        setDiscordData(data);
        setError(null);
      } catch (err) {
        setError('Erro ao buscar Discord.');
        console.error('Error fetching Discord data:', err);
        setDiscordData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Atualiza a cada 30 segundos para pegar mudanças de avatar/nome em tempo real
    const interval = setInterval(fetchProfile, 30_000);
    return () => clearInterval(interval);
  }, []);

  // connectDiscord mantido para não quebrar imports, mas não faz nada
  const connectDiscord = () => {};

  return { discordData, loading, error, connectDiscord };
}