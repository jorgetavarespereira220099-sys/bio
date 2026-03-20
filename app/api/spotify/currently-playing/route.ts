import { NextResponse } from 'next/server';

// app/api/spotify/currently-playing/route.ts
// Usa refresh token fixo no servidor — sem OAuth no browser, funciona em qualquer PC.

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string | null> {
  // Reutiliza token em cache enquanto válido (com 1 min de margem)
  if (cachedAccessToken && tokenExpiresAt > Date.now() + 60_000) {
    return cachedAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !refreshToken) {
    console.error('Faltando SPOTIFY_CLIENT_ID ou SPOTIFY_REFRESH_TOKEN nas env vars.');
    return null;
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error('Falha ao renovar token do Spotify:', res.status);
    return null;
  }

  const json = await res.json() as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  cachedAccessToken = json.access_token;
  tokenExpiresAt = Date.now() + json.expires_in * 1000;

  return json.access_token;
}

type SpotifyData = {
  song: string;
  artist: string;
  album_art_url: string;
  timestamps: { start: number; end: number };
};

export async function GET() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Não foi possível obter token do Spotify. Verifique as env vars.' },
      { status: 500 }
    );
  }

  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'bio-site-nextjs',
    },
    cache: 'no-store',
  });

  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text().catch(() => '');
    let details = text;
    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text) as { error?: { message?: string } };
        if (json?.error?.message) details = json.error.message;
      } catch { /* mantém text */ }
    }
    return NextResponse.json(
      { error: `Spotify currently-playing falhou (HTTP ${res.status}). ${details}`.trim() },
      { status: res.status }
    );
  }

  const json = await res.json() as {
    is_playing: boolean;
    progress_ms: number;
    item: {
      name: string;
      duration_ms: number;
      artists: Array<{ name: string }>;
      album: { images: Array<{ url: string }> };
    };
  };

  const start = Date.now() - json.progress_ms;
  const end = start + json.item.duration_ms;

  const data: SpotifyData = {
    song: json.item.name,
    artist: json.item.artists?.[0]?.name || '-',
    album_art_url: json.item.album?.images?.[0]?.url || '',
    timestamps: { start, end },
  };

  return NextResponse.json(data);
}