import { NextResponse } from 'next/server';

import { CONFIG } from '@/lib/config';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      code: string;
      codeVerifier: string;
      redirectUri: string;
    };

    const { code, codeVerifier, redirectUri } = body;

    if (!code) return NextResponse.json({ error: 'Faltou "code".' }, { status: 400 });
    if (!codeVerifier)
      return NextResponse.json({ error: 'Faltou "codeVerifier".' }, { status: 400 });
    if (!redirectUri)
      return NextResponse.json({ error: 'Faltou "redirectUri".' }, { status: 400 });

    const clientId = CONFIG.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'Faltando SPOTIFY_CLIENT_ID na config.' }, { status: 500 });
    }

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
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
      expires_in: number;
      refresh_token?: string;
    };

    return NextResponse.json(tokenJson);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro desconhecido no callback do Spotify.' },
      { status: 500 }
    );
  }
}

