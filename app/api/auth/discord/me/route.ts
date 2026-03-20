import { NextResponse } from 'next/server';

// app/api/auth/discord/me/route.ts
// Puxa o perfil fixo do dono do site via bot token — sem OAuth, funciona em qualquer PC.

export async function GET() {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const userId = process.env.DISCORD_USER_ID;

  if (!botToken || !userId) {
    return NextResponse.json(
      { error: 'Faltando DISCORD_BOT_TOKEN ou DISCORD_USER_ID nas env vars.' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
        'User-Agent': 'bio-site-nextjs',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Discord API falhou (HTTP ${res.status}). ${text}`.trim() },
        { status: res.status }
      );
    }

    const data = await res.json() as {
      id: string;
      username: string;
      global_name?: string | null;
      avatar?: string | null;
      discriminator?: string | null;
      bio?: string | null;
    };

    return NextResponse.json({
      discord_user: {
        id: data.id,
        username: data.username,
        global_name: data.global_name ?? undefined,
        avatar: data.avatar ?? undefined,
        discriminator: data.discriminator ?? '0',
        bio: data.bio ?? undefined,
      },
      discord_status: 'online',
      activities: [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}