import { NextResponse } from 'next/server';

type SpotifyData = {
  song: string;
  artist: string;
  album_art_url: string;
  timestamps: {
    start: number;
    end: number;
  };
};

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;

  if (!token) {
    return NextResponse.json({ error: 'Acesso negado: missing Bearer token.' }, { status: 401 });
  }

  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'bio-site-nextjs',
    },
    cache: 'no-store',
  });

  if (res.status === 204) {
    // Nenhuma música tocando agora.
    return new NextResponse(null, { status: 204 });
  }

  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text().catch(() => '');
    let details = text;
    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text) as { error?: { message?: string; status?: number } };
        const msg = json?.error?.message;
        if (msg) details = msg;
      } catch {
        // mantém `text`
      }
    }
    return NextResponse.json(
      {
        error:
          `Spotify currently-playing falhou (HTTP ${res.status}). ${details}`.trim() ||
          `Spotify currently-playing falhou (HTTP ${res.status}).`,
      },
      { status: res.status }
    );
  }

  const json = (await res.json()) as {
    is_playing: boolean;
    progress_ms: number;
    item: {
      name: string;
      duration_ms: number;
      artists: Array<{ name: string }>;
      album: { images: Array<{ url: string }> };
    };
  };

  const durationMs = json.item.duration_ms;
  const progressMs = json.progress_ms;

  const start = Date.now() - progressMs;
  const end = start + durationMs;

  const data: SpotifyData = {
    song: json.item.name,
    artist: json.item.artists?.[0]?.name || '-',
    album_art_url: json.item.album?.images?.[0]?.url || '',
    timestamps: { start, end },
  };

  return NextResponse.json(data);
}

