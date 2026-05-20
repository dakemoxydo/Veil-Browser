import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '@veil/shared';

export const ProfileSwitcher: React.FC = React.memo(() => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentId, setCurrentId] = useState('default');
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreate(false);
      }
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [isOpen]);

  const loadProfiles = async () => {
    try {
      const list = await window.veil.profileList();
      setProfiles(list);
    } catch {
      // ignore
    }
  };

  const handleSwitch = async (id: string) => {
    if (id === currentId) return;
    if (confirm('Switching profiles will restart the browser. Continue?')) {
      await window.veil.profileSwitch(id);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await window.veil.profileCreate(newName.trim());
    if (result.success) {
      setNewName('');
      setShowCreate(false);
      await loadProfiles();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this profile? This cannot be undone.')) {
      const result = await window.veil.profileDelete(id);
      if (result.success) {
        await loadProfiles();
      }
    }
  };

  const currentProfile = profiles.find(p => p.id === currentId);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Profile switcher"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          padding: '4px 8px',
          fontSize: '11px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
        <span>{currentProfile?.name || 'Default'}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Profiles"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '6px',
            minWidth: '200px',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {profiles.map(profile => (
            <div
              key={profile.id}
              role="option"
              aria-selected={profile.id === currentId}
              onClick={() => handleSwitch(profile.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '6px',
                cursor: profile.id === currentId ? 'default' : 'pointer',
                background: profile.id === currentId ? 'rgba(138,180,248,0.12)' : 'transparent',
                color: profile.id === currentId ? 'var(--accent)' : 'var(--text-primary)',
                fontSize: '12px',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => {
                if (profile.id !== currentId) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = profile.id === currentId ? 'rgba(138,180,248,0.12)' : 'transparent';
              }}
            >
              <span>{profile.name}</span>
              {!profile.isDefault && (
                <button
                  onClick={(e) => handleDelete(profile.id, e)}
                  aria-label={`Delete ${profile.name}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    opacity: 0.6,
                    transition: 'opacity 150ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >
                  &times;
                </button>
              )}
            </div>
          ))}

          {showCreate ? (
            <div style={{ padding: '8px 6px', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Profile name"
                autoFocus
                style={{
                  width: '100%',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  padding: '6px 8px',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  onClick={handleCreate}
                  style={{
                    flex: 1,
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#000',
                    padding: '5px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setShowCreate(false); setNewName(''); }}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    padding: '5px',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid var(--border)',
                color: 'var(--accent)',
                cursor: 'pointer',
                padding: '8px 10px',
                fontSize: '12px',
                marginTop: '4px',
                textAlign: 'left',
                borderRadius: '0 0 6px 6px',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              + New Profile
            </button>
          )}
        </div>
      )}
    </div>
  );
});
