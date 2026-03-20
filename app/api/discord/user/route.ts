import { NextResponse } from 'next/server';

// app/api/auth/discord/token/route.ts
// Troca o authorization code pelo access_token do Discord.
// Feito server-side para não expor o DISCORD_CLIENT_SECRET no browser.

export async function POST(request: Request) {
  try {
    const body = await request.json() as { code: string; redirectUri: string };
    const { code, redirectUri } = body;

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'Faltando code ou redirectUri.' },
        { status: 400 }
      );
    }

    const clientId = process.env.DISCORD_OAUTH_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Faltando DISCORD_OAUTH_CLIENT_ID ou DISCORD_CLIENT_SECRET nas env vars.' },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Discord token exchange falhou (HTTP ${res.status}). ${text}`.trim() },
        { status: res.status }
      );
    }

    const json = await res.json() as { access_token: string; token_type: string };

    return NextResponse.json({ access_token: json.access_token });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido.' },
      { status: 500 }
    );
  }
}