import { NextResponse } from 'next/server';

// app/api/spotify/currently-playing/route.ts
<<<<<<< HEAD
// Usa Client Secret + Refresh Token — estável, sem risco de revogação acidental.

const REFRESH_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';

let cachedToken = '';
let tokenExpiresAt = 0;

function getBasicAuth(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN!;

  const res = await fetch(REFRESH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${getBasicAuth()}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
=======
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
>>>>>>> f28fc102f5bf3c85b0c38027338774192404c476
    cache: 'no-store',
  });

  if (!res.ok) {
<<<<<<< HEAD
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao renovar token (HTTP ${res.status}): ${text}`);
  }

  const json = await res.json() as { access_token: string; expires_in: number };
  cachedToken = json.access_token;
  tokenExpiresAt = Date.now() + json.expires_in * 1000;
  return cachedToken;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && tokenExpiresAt > Date.now() + 60_000) {
    return cachedToken;
  }
  return refreshAccessToken();
=======
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
>>>>>>> f28fc102f5bf3c85b0c38027338774192404c476
}

type SpotifyData = {
  song: string;
  artist: string;
  album_art_url: string;
  timestamps: { start: number; end: number };
};

<<<<<<< HEAD
async function fetchNowPlaying(token: string): Promise<Response> {
  return fetch(NOW_PLAYING_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
=======
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
>>>>>>> f28fc102f5bf3c85b0c38027338774192404c476
      'User-Agent': 'bio-site-nextjs',
    },
    cache: 'no-store',
  });
<<<<<<< HEAD
}

export async function GET() {
  try {
    let token = await getAccessToken();
    let res = await fetchNowPlaying(token);

    // Se 401, renova o token e tenta uma vez mais
    if (res.status === 401) {
      token = await refreshAccessToken();
      res = await fetchNowPlaying(token);
    }

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Spotify falhou (HTTP ${res.status}). ${text}`.trim() },
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
      } | null;
    };

    if (!json.item || !json.is_playing) {
      return new NextResponse(null, { status: 204 });
    }

    const start = Date.now() - json.progress_ms;
    const end = start + json.item.duration_ms;

    const data: SpotifyData = {
      song: json.item.name,
      artist: json.item.artists?.[0]?.name || '-',
      album_art_url: json.item.album?.images?.[0]?.url || '',
      timestamps: { start, end },
    };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=4, stale-while-revalidate=2',
      },
    });
  } catch (err) {
    console.error('Spotify route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido.' },
      { status: 500 }
    );
  }
=======

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
>>>>>>> f28fc102f5bf3c85b0c38027338774192404c476
}