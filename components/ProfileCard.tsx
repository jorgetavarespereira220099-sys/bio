'use client';

import { useState, useEffect } from 'react';
import { useDiscord } from '@/hooks/useDiscord';
import TypingEffect from './TypingEffect';
import { copyToClipboard } from '@/lib/utils';

const socialLinks = [
  {
    href: '#',
    link: 'e3i0',
    platform: 'Discord',
    icon: 'fab fa-discord',
    label: 'Discord',
  },
  {
    href: '#',
    link: 'https://github.com/bielznnx',
    platform: 'GitHub',
    icon: 'fab fa-github',
    label: 'GitHub',
  },
  {
    href: '#',
    link: 'https://open.spotify.com/user/r7r6x6q0e7vpc2e4bpgoiv76s?si=3dd2e8fd545e490f',
    platform: 'Spotify',
    icon: 'fab fa-spotify',
    label: 'Spotify',
  },
  {
    href: '#',
    link: 'jorgetavarespereira220099@gmail.com',
    platform: 'Email',
    icon: 'fas fa-envelope',
    label: 'Contact',
  },
];

function showNotification(title: string, message: string, type: 'success' | 'error' = 'success', duration = 3000) {
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notif => notif.remove());
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icon = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
  
  notification.innerHTML = `
    <div class="notification-icon">
      <i class="${icon}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, duration);
}

export default function ProfileCard() {
  const { discordData, error } = useDiscord();
  const [lastSeen, setLastSeen] = useState('calculating...');

  useEffect(() => {
    const updateLastSeen = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      setLastSeen(`Last seen: ${timeString}`);
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);

    return () => clearInterval(interval);
  }, []);

  const avatarUrl = discordData?.discord_user.avatar
    ? `https://cdn.discordapp.com/avatars/${discordData.discord_user.id}/${discordData.discord_user.avatar}.png?size=128`
    : discordData?.discord_user.discriminator
    ? `https://cdn.discordapp.com/embed/avatars/${parseInt(discordData.discord_user.discriminator) % 5}.png`
    : null;

  const status = discordData?.discord_status || 'offline';
  
  const statusTexts = {
    'online': 'Online - Available for projects',
    'idle': 'Away - Will respond later',
    'dnd': 'Do Not Disturb - Busy',
    'offline': 'Offline - Leave a message'
  };

  const statusText = error ? error : (statusTexts[status] || 'Unknown status');

  const handleSocialLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>, linkData: typeof socialLinks[0]) => {
    e.preventDefault();
    
    const link = e.currentTarget;
    link.classList.add('copying');
    setTimeout(() => {
      link.classList.remove('copying');
    }, 150);
    
    const success = await copyToClipboard(linkData.link);
    
    if (success) {
      showNotification(
        `${linkData.platform} copied!`,
        `Link has been copied to your clipboard`,
        'success'
      );
    } else {
      showNotification(
        'Copy error',
        'Unable to copy link automatically',
        'error'
      );
    }
  };

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="profile-avatar">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="main-avatar-img"
            />
          ) : (
            <div 
              className="main-avatar-img" 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2f3136',
              }}
            >
              <i className="fas fa-user" style={{ fontSize: '48px', color: '#888888' }}></i>
            </div>
          )}
          <div className="avatar-border"></div>
        </div>
        
        <div className="profile-details">
          <h1 className="display-name">
            <span className="name-text">
              {discordData?.discord_user.global_name ||
                discordData?.discord_user.username ||
                (error ? 'Discord indisponível' : 'x')}
            </span>
          </h1>
          
          <div className="bio-section">
            <TypingEffect />
            {discordData?.discord_user.bio ? (
              <p
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {discordData.discord_user.bio}
              </p>
            ) : null}
          </div>
          
          <div className="status-info">
            <div className={`status-dot ${status}`}></div>
            <span className="status-text">
              {statusText}
            </span>
          </div>
        </div>
      </div>
      
      <div className="divider"></div>
      
      <div className="social-links">
        <div className="links-grid">
          {socialLinks.map((linkData, index) => (
            <a
              key={index}
              href={linkData.href}
              className="social-link"
              onClick={(e) => handleSocialLinkClick(e, linkData)}
            >
              <div className="link-icon">
                <i className={linkData.icon}></i>
              </div>
              <span className="link-label">{linkData.label}</span>
              <div className="link-arrow">
                <i className="fas fa-arrow-right"></i>
              </div>
            </a>
          ))}
        </div>
      </div>
      
      <div className="footer">
        <div className="footer-content">
          <div className="copyright">
            <i className="fas fa-code"></i>
            <span>© 2026</span>
          </div>
          <div className="last-seen">
            <i className="fas fa-clock"></i>
            <span>{lastSeen}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

