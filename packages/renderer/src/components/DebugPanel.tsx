import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { LogEntry, LogLevel } from '@veil/shared';

type FilterType = 'ALL' | LogLevel;

const levelColors: Record<LogLevel, string> = {
  INFO: 'var(--accent)',
  WARN: 'var(--warning)',
  ERROR: 'var(--danger)',
  ACTION: '#8b5cf6',
  DEBUG: 'var(--text-muted)',
};

const levelBgColors: Record<LogLevel, string> = {
  INFO: 'var(--accent-focus)',
  WARN: 'rgba(245, 158, 11, 0.15)',
  ERROR: 'rgba(239, 68, 68, 0.15)',
  ACTION: 'rgba(139, 92, 246, 0.15)',
  DEBUG: 'rgba(107, 114, 128, 0.15)',
};

export const DebugPanel: React.FC = React.memo(() => {
  const logs = useVeilStore((s) => s.logs);
  const clearLogs = useVeilStore((s) => s.clearLogs);
  const isVisible = useVeilStore((s) => s.debugPanelVisible);
  const toggleDebugPanel = useVeilStore((s) => s.toggleDebugPanel);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    if (filter === 'ALL') return logs;
    return logs.filter((log) => log.level === filter);
  }, [logs, filter]);

  const errorCount = useMemo(() => logs.filter((l) => l.level === 'ERROR').length, [logs]);
  const warnCount = useMemo(() => logs.filter((l) => l.level === 'WARN').length, [logs]);

  useEffect(() => {
    if (isExpanded && isVisible && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [logs, isExpanded, isVisible]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const formatData = (data: unknown) => {
    if (!data) return null;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const filters: FilterType[] = ['ALL', 'INFO', 'WARN', 'ERROR', 'ACTION', 'DEBUG'];

  // Guard AFTER all hooks to avoid Rules of Hooks violation
  if (!isVisible) return null;

  if (!isExpanded) {
    return (
      <div
        className="debug-panel-minimized"
        role="button"
        tabIndex={0}
        aria-label="Expand debug console"
        onClick={() => setIsExpanded(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(true);
          }
        }}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 16px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-family-monospace)',
          fontSize: 'var(--font-size-xs)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {errorCount > 0 && <span style={{ color: 'var(--danger)' }}>[{errorCount}]</span>}
        {warnCount > 0 && <span style={{ color: 'var(--warning)' }}>[{warnCount}]</span>}
        <span>Debug ({logs.length})</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDebugPanel();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '0 4px',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 1,
          }}
          aria-label="Hide debug console"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      className="debug-panel"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: '600px',
        height: '400px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9999,
        fontFamily: 'var(--font-family-monospace)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--glass-border)',
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
            Debug Console
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
            ({logs.length} entries)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => clearLogs()}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              padding: '4px 8px',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              padding: '4px 8px',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
            }}
          >
            Min
          </button>
          <button
            onClick={() => toggleDebugPanel()}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              padding: '4px 8px',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Log level filter"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-light)',
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        {filters.map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? (f === 'ALL' ? 'var(--glass-border)' : levelBgColors[f as LogLevel]) : 'transparent',
              border: `1px solid ${filter === f ? (f === 'ALL' ? 'var(--border)' : levelColors[f as LogLevel]) : 'var(--glass-border)'}`,
              borderRadius: 'var(--radius-sm)',
              color: filter === f ? (f === 'ALL' ? 'var(--text-primary)' : levelColors[f as LogLevel]) : 'var(--text-muted)',
              padding: '4px 10px',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            No logs to display
          </div>
        ) : (
          filteredLogs.map((log) => (
            <LogItem key={log.id} log={log} formatTime={formatTime} formatData={formatData} />
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
});

interface LogItemProps {
  log: LogEntry;
  formatTime: (timestamp: number) => string;
  formatData: (data: unknown) => string | null;
}

const LogItem: React.FC<LogItemProps> = ({ log, formatTime, formatData }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={() => log.data && setExpanded(!expanded)}
      role={log.data ? 'button' : undefined}
      tabIndex={log.data ? 0 : undefined}
      onKeyDown={log.data ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded(!expanded);
        }
      } : undefined}
      style={{
        padding: '6px 16px',
        borderBottom: '1px solid var(--border-light)',
        cursor: log.data ? 'pointer' : 'default',
        background: log.level === 'ERROR' ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span
          style={{
            color: levelColors[log.level],
            fontWeight: 600,
            fontSize: 'var(--font-size-xs)',
            minWidth: '50px',
          }}
        >
          {log.level}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', minWidth: '70px' }}>
          {formatTime(log.timestamp)}
        </span>
        <span
          style={{
            color: '#8b5cf6',
            fontSize: 'var(--font-size-xs)',
            minWidth: '80px',
          }}
        >
          {log.source}
        </span>
        <span style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-xs)', flex: 1, wordBreak: 'break-word' }}>
          {log.message}
        </span>
        {!!log.data && (
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }} aria-hidden="true">
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </div>
      {expanded && !!log.data && (
        <pre
          style={{
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
            overflow: 'auto',
            maxHeight: '150px',
          }}
        >
          {formatData(log.data)}
        </pre>
      )}
    </div>
  );
};
