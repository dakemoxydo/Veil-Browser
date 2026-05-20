import React, { useState, useEffect, useCallback } from 'react';
import { CredentialMeta, Credential } from '@veil/shared';

interface EditingCredential {
  id?: string;
  url: string;
  username: string;
  password: string;
  title: string;
}

export const PasswordManager: React.FC = React.memo(() => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [credentials, setCredentials] = useState<CredentialMeta[]>([]);
  const [selected, setSelected] = useState<Credential | null>(null);
  const [editing, setEditing] = useState<EditingCredential | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadCredentials = useCallback(async () => {
    try {
      const result = await window.veil.passwordList();
      if (Array.isArray(result)) {
        setCredentials(result);
      } else if (result && typeof result === 'object' && 'credentials' in result) {
        setCredentials((result as { credentials: CredentialMeta[] }).credentials || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      loadCredentials();
    }
  }, [isUnlocked, loadCredentials]);

  const handleUnlock = async () => {
    if (!masterPassword) return;
    setError('');
    const result = await window.veil.passwordUnlock(masterPassword);
    if (result.success) {
      setIsUnlocked(true);
      setMasterPassword('');
    } else {
      setError(result.error || 'Invalid master password');
    }
  };

  const handleLock = () => {
    window.veil.passwordLock();
    setIsUnlocked(false);
    setCredentials([]);
    setSelected(null);
    setEditing(null);
  };

  const handleSelect = async (id: string) => {
    try {
      const result = await window.veil.passwordGet(id);
      if (result.success && result.credential) {
        setSelected(result.credential);
        setEditing(null);
      }
    } catch {
      // ignore
    }
  };

  const handleAdd = () => {
    setEditing({ url: '', username: '', password: '', title: '' });
    setSelected(null);
  };

  const handleEdit = () => {
    if (!selected) return;
    setEditing({
      id: selected.id,
      url: selected.url,
      username: selected.username,
      password: selected.password,
      title: selected.title,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.url || !editing.username) {
      setError('URL and username are required');
      return;
    }

    if (editing.id) {
      const result = await window.veil.passwordUpdate(editing.id, {
        url: editing.url,
        username: editing.username,
        password: editing.password,
        title: editing.title,
      });
      if (result.success) {
        setEditing(null);
        await loadCredentials();
        await handleSelect(editing.id);
      }
    } else {
      const result = await window.veil.passwordAdd({
        url: editing.url,
        username: editing.username,
        password: editing.password,
        title: editing.title,
      });
      if (result.success) {
        setEditing(null);
        await loadCredentials();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this credential?')) return;
    await window.veil.passwordDelete(id);
    setSelected(null);
    await loadCredentials();
  };

  const filtered = searchQuery
    ? credentials.filter(c =>
        c.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : credentials;

  // Unlock screen
  if (!isUnlocked) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '40px',
        color: 'var(--text-primary)',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ marginBottom: '20px' }}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Password Manager</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
          Enter your master password to unlock
        </p>
        <input
          type="password"
          value={masterPassword}
          onChange={e => setMasterPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          placeholder="Master password"
          autoFocus
          style={{
            width: '300px',
            padding: '10px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
            marginBottom: '12px',
          }}
        />
        {error && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>{error}</p>
        )}
        <button
          onClick={handleUnlock}
          style={{
            padding: '10px 32px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            color: '#000',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Sidebar — credentials list */}
      <div style={{
        width: '300px',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Passwords</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleAdd}
                aria-label="Add credential"
                style={{
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  padding: '5px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + Add
              </button>
              <button
                onClick={handleLock}
                aria-label="Lock vault"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  padding: '5px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Lock
              </button>
            </div>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search passwords..."
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
              {searchQuery ? 'No matches' : 'No saved passwords'}
            </div>
          ) : (
            filtered.map(cred => (
              <div
                key={cred.id}
                onClick={() => handleSelect(cred.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: selected?.id === cred.id ? 'rgba(138,180,248,0.12)' : 'transparent',
                  marginBottom: '2px',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => {
                  if (selected?.id !== cred.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = selected?.id === cred.id ? 'rgba(138,180,248,0.12)' : 'transparent';
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>
                  {cred.title || cred.url}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cred.username}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail / Edit panel */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {editing ? (
          <div style={{ padding: '24px', maxWidth: '500px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
              {editing.id ? 'Edit Credential' : 'Add Credential'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Title
                <input
                  type="text"
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 10px',
                    marginTop: '4px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                URL
                <input
                  type="text"
                  value={editing.url}
                  onChange={e => setEditing({ ...editing, url: e.target.value })}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 10px',
                    marginTop: '4px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Username
                <input
                  type="text"
                  value={editing.username}
                  onChange={e => setEditing({ ...editing, username: e.target.value })}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 10px',
                    marginTop: '4px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Password
                <input
                  type="password"
                  value={editing.password}
                  onChange={e => setEditing({ ...editing, password: e.target.value })}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 10px',
                    marginTop: '4px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
              {error && (
                <p style={{ color: '#ef4444', fontSize: '12px' }}>{error}</p>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '8px 24px',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#000',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditing(null); setError(''); }}
                  style={{
                    padding: '8px 24px',
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : selected ? (
          <div style={{ padding: '24px', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{selected.title || selected.url}</h3>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleEdit}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: 'none',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    padding: '5px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(selected.id)}
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ef4444',
                    padding: '5px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>URL</div>
                <div style={{ fontSize: '13px' }}>{selected.url}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Username</div>
                <div style={{ fontSize: '13px' }}>{selected.username}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Password</div>
                <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>{selected.password}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Created</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {new Date(selected.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            fontSize: '13px',
          }}>
            Select a credential or add a new one
          </div>
        )}
      </div>
    </div>
  );
});
