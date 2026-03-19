export const CONFIG = {
  DISCORD_USER_ID: '1439121979046232136',
  // OAuth (usuário autoriza)
  DISCORD_OAUTH_CLIENT_ID: '1465978019901341738',
  DISCORD_OAUTH_SCOPE: 'identify connections',

  // Spotify OAuth (PKCE)
  SPOTIFY_CLIENT_ID: 'f65970eb58dd4499979e267d2338dde8',
  // URI dinâmica: pega a origem real do browser (localhost:3000 em dev, domínio em prod).
  // Cadastre TODAS as origens no Spotify Developer Dashboard → Redirect URIs.
  get SPOTIFY_REDIRECT_URI() {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/callback`;
    }
    return 'http://127.0.0.1:5500/callback';
  },
  UPDATE_INTERVAL: 30000,
  SPOTIFY_UPDATE_INTERVAL: 5000,
};