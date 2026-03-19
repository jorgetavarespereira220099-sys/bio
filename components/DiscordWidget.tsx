'use client';

import { useDiscord } from '@/hooks/useDiscord';

export default function DiscordWidget() {
  const { discordData, error, connectDiscord } = useDiscord();

  if (!discordData) {
    return (
      <div className="widget discord-widget">
        <div className="widget-header">
          <div className="widget-icon">
            <i className="fab fa-discord"></i>
          </div>
          <span className="widget-title">Discord</span>
          <div className="status-indicator offline"></div>
        </div>
        <div className="widget-content">
          <div className="discord-profile">
            <div className="avatar-container">
              <div 
                className="avatar" 
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#2f3136',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="fab fa-discord" style={{ color: '#5865f2' }}></i>
              </div>
              <div className="status-badge offline"></div>
            </div>
            <div className="profile-info">
              <span className="username">{error ? error : 'Discord não conectado'}</span>
              <div className="activity">
                <span className="activity-text">
                  {error ? 'Detalhes acima' : 'Clique para autorizar'}
                </span>
              </div>
              <button
                onClick={connectDiscord}
                style={{
                  marginTop: 12,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: '1px solid var(--border-secondary)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Conectar Discord
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = discordData.discord_user.avatar
    ? `https://cdn.discordapp.com/avatars/${discordData.discord_user.id}/${discordData.discord_user.avatar}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordData.discord_user.discriminator) % 5}.png`;

  const status = discordData.discord_status || 'offline';
  
  const getActivityText = () => {
    if (discordData.activities && discordData.activities.length > 0) {
      const customStatus = discordData.activities.find(act => act.type === 4);
      if (customStatus) {
        const emoji = customStatus.emoji ? `${customStatus.emoji.name} ` : '';
        const state = customStatus.state || '';
        return `${emoji}${state}`.trim() || 'Custom Status';
      } else {
        const currentActivity = discordData.activities[0];
        if (currentActivity.type === 0) {
          return `Playing ${currentActivity.name}`;
        } else if (currentActivity.type === 2) {
          return `Listening to ${currentActivity.name}`;
        } else if (currentActivity.type === 3) {
          return `Watching ${currentActivity.name}`;
        } else {
          return currentActivity.name;
        }
      }
    }
    
    const activityStatusTexts = {
      'online': 'Online',
      'idle': 'Away',
      'dnd': 'Do Not Disturb',
      'offline': 'Offline'
    };
    return activityStatusTexts[status] || 'Offline';
  };

  return (
    <div className="widget discord-widget">
      <div className="widget-header">
        <div className="widget-icon">
          <i className="fab fa-discord"></i>
        </div>
        <span className="widget-title">Discord</span>
        <div className={`status-indicator ${status}`}></div>
      </div>
      <div className="widget-content">
        <div className="discord-profile">
          <div className="avatar-container">
            <img
              src={avatarUrl}
              alt="Discord Avatar"
              className="avatar"
            />
            <div className={`status-badge ${status}`}></div>
          </div>
          <div className="profile-info">
            <span className="username">
              {discordData.discord_user.global_name || discordData.discord_user.username}
            </span>
            <div className="activity">
              <span className="activity-text">{getActivityText()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

