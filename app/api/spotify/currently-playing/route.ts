import { NextResponse } from 'next/server';

// app/api/spotify/currently-playing/route.ts
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
    cache: 'no-store',
  });

  if (!res.ok) {
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
}

type SpotifyData = {
  song: string;
  artist: string;
  album_art_url: string;
  timestamps: { start: number; end: number };
};

async function fetchNowPlaying(token: string): Promise<Response> {
  return fetch(NOW_PLAYING_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'bio-site-nextjs',
    },
    cache: 'no-store',
  });
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
}