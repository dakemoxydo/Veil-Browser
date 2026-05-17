import React from 'react';
import { useVeilStore } from '../store/useVeilStore';

export const ExtensionIcon: React.FC = () => {
  const dispatch = useVeilStore((s) => s.dispatch);
  return (
    <div
      className="extension-icon liquid-hover glass"
      role="button"
      tabIndex={0}
      aria-label="Load extension"
      onClick={() => dispatch({ type: 'EXT_DIALOG_OPEN', payload: {} })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dispatch({ type: 'EXT_DIALOG_OPEN', payload: {} });
        }
      }}
      style={{
      width: '28px',
      height: '28px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '14px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid var(--veil-glass-border)'
    }}>
      <span aria-hidden="true">🧩</span>
    </div>
  );
};
