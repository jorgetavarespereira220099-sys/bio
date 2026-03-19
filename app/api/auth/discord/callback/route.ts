import { NextResponse } from 'next/server';

import { CONFIG } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { code: string; redirectUri: string };
    const code = body.code;
    const redirectUri = body.redirectUri;

    if (!code) {
      return NextResponse.json({ error: 'Faltou "code".' }, { status: 400 });
    }
    if (!redirectUri) {
      return NextResponse.json({ error: 'Faltou "redirectUri".' }, { status: 400 });
    }

    const clientId = CONFIG.DISCORD_OAUTH_CLIENT_ID;
    const clientSecret = process.env.DISCORD_OAUTH_CLIENT_SECRET;

    if (!clientSecret) {
      return NextResponse.json(
        { error: 'Faltando env var DISCORD_OAUTH_CLIENT_SECRET no servidor.' },
        { status: 500 }
      );
    }
    if (!clientId) {
      return NextResponse.json({ error: 'Faltando DISCORD_OAUTH_CLIENT_ID na config.' }, { status: 500 });
    }

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => '');
      return NextResponse.json(
        { error: `Falha no token exchange (HTTP ${tokenRes.status}). ${text}`.trim() },
        { status: tokenRes.status }
      );
    }

    const tokenJson = (await tokenRes.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    const meRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        'User-Agent': 'bio-site-nextjs',
      },
    });

    if (!meRes.ok) {
      const text = await meRes.text().catch(() => '');
      return NextResponse.json(
        { error: `Falha ao buscar perfil do Discord (HTTP ${meRes.status}). ${text}`.trim() },
        { status: meRes.status }
      );
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
      access_token: tokenJson.access_token,
      discord_user: {
        id: me.id,
        username: me.username,
        global_name: me.global_name ?? undefined,
        avatar: me.avatar ?? undefined,
        discriminator: me.discriminator ?? '0',
        bio: me.bio ?? undefined,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro desconhecido no callback do Discord.' },
      { status: 500 }
    );
  }
}

