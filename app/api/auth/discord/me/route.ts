import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;

  if (!token) {
    return NextResponse.json({ error: 'Acesso negado: missing Bearer token.' }, { status: 401 });
  }

  const meRes = await fetch('https://discord.com/api/v10/users/@me', {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'bio-site-nextjs',
    },
  });

  if (!meRes.ok) {
    return NextResponse.json({ error: `Discord /me falhou (HTTP ${meRes.status}).` }, { status: meRes.status });
  }

  const me = (await meRes.json()) as {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
    discriminator?: string;
    bio?: string;
  };

  return NextResponse.json({
    discord_user: {
      id: me.id,
      username: me.username,
      global_name: me.global_name ?? undefined,
      avatar: me.avatar ?? undefined,
      discriminator: me.discriminator ?? '0',
      bio: me.bio ?? undefined,
    },
    // OAuth não entrega presença, então mantemos um status “conectado” neutro.
    discord_status: 'online',
    activities: [],
  });
}

