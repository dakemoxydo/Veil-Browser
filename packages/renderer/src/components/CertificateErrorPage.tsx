import React, { useState } from 'react';

interface CertificateErrorPageProps {
  hostname: string;
  error: string;
  fingerprint?: string;
  onProceed?: () => void;
  onGoBack?: () => void;
}

export const CertificateErrorPage: React.FC<CertificateErrorPageProps> = ({
  hostname,
  error,
  fingerprint,
  onProceed,
  onGoBack,
}) => {
  const [addingException, setAddingException] = useState(false);

  const handleAddException = async () => {
    if (!fingerprint) return;
    setAddingException(true);
    try {
      await window.veil?.dispatch?.({
        type: 'CERT_EXCEPTION_ADD',
        payload: { fingerprint, hostname },
      });
      onProceed?.();
    } catch {
      setAddingException(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      padding: '40px',
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>

      <h1 style={{
        fontSize: '24px',
        fontWeight: 600,
        marginBottom: '8px',
        textAlign: 'center',
      }}>
        Your connection is not private
      </h1>

      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '14px',
        textAlign: 'center',
        maxWidth: '500px',
        marginBottom: '8px',
      }}>
        Attackers might be trying to steal your information from <strong>{hostname}</strong>
      </p>

      <div style={{
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        marginBottom: '24px',
        maxWidth: '500px',
        width: '100%',
      }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>
          Error type
        </div>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
          {error}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onGoBack}
          style={{
            padding: '8px 24px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'var(--transition-fast)',
          }}
        >
          Go back
        </button>

        {fingerprint && (
          <button
            onClick={handleAddException}
            disabled={addingException}
            style={{
              padding: '8px 24px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '14px',
              cursor: addingException ? 'not-allowed' : 'pointer',
              opacity: addingException ? 0.7 : 1,
              transition: 'var(--transition-fast)',
            }}
          >
            {addingException ? 'Adding...' : 'Add exception'}
          </button>
        )}
      </div>

      <p style={{
        color: 'var(--text-muted)',
        fontSize: '11px',
        marginTop: '24px',
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        Adding an exception will allow connections to this site despite the certificate error.
        Only do this if you trust this site.
      </p>
    </div>
  );
};
