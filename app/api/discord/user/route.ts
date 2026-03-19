import { NextResponse } from 'next/server';

import { CONFIG } from '@/lib/config';

type DiscordUserResponse = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || CONFIG.DISCORD_USER_ID;

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      {
        error:
          'Faltando env var DISCORD_BOT_TOKEN. Crie um bot no Discord e configure o token no servidor.',
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
        'User-Agent': 'bio-site-nextjs',
      },
      // Não cacheia, porque é para exibir status/perfil atual.
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Discord API falhou (HTTP ${res.status}). ${text}`.trim() },
        { status: res.status }
      );
    }

    const data = (await res.json()) as DiscordUserResponse;

    return NextResponse.json({
      discord_user: {
        id: data.id,
        username: data.username,
        global_name: data.global_name ?? undefined,
        avatar: data.avatar ?? undefined,
        // Alguns usuários não têm discriminator (contas modernas). O widget usa fallback disso.
        discriminator: data.discriminator ?? '0',
      },
      // A API REST não devolve “presence”/atividades completas sem gateway/intents.
      // Mantemos o contrato existente para não quebrar a UI.
      discord_status: 'offline',
      activities: [],
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Erro desconhecido ao buscar Discord.',
      },
      { status: 500 }
    );
  }
}

