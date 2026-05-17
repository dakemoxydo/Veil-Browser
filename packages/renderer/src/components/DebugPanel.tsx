import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { LogEntry, LogLevel } from '@veil/shared';

type FilterType = 'ALL' | LogLevel;

const levelColors: Record<LogLevel, string> = {
  INFO: '#3b82f6',
  WARN: '#f59e0b',
  ERROR: '#ef4444',
  ACTION: '#8b5cf6',
  DEBUG: '#6b7280',
};

const levelBgColors: Record<LogLevel, string> = {
  INFO: 'rgba(59, 130, 246, 0.15)',
  WARN: 'rgba(245, 158, 11, 0.15)',
  ERROR: 'rgba(239, 68, 68, 0.15)',
  ACTION: 'rgba(139, 92, 246, 0.15)',
  DEBUG: 'rgba(107, 114, 128, 0.15)',
};

export const DebugPanel: React.FC = () => {
  const logs = useVeilStore((s) => s.logs);
  const clearLogs = useVeilStore((s) => s.clearLogs);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [isMinimized, setIsMinimized] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const filteredLogs = filter === 'ALL' ? logs : logs.filter((log) => log.level === filter);

  const errorCount = useMemo(() => logs.filter((l) => l.level === 'ERROR').length, [logs]);
  const warnCount = useMemo(() => logs.filter((l) => l.level === 'WARN').length, [logs]);

  useEffect(() => {
    if (!isMinimized && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [logs, isMinimized]);

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

  if (isMinimized) {
    return (
      <div
        className="debug-panel-minimized"
        role="button"
        tabIndex={0}
        aria-label="Expand debug console"
        onClick={() => setIsMinimized(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsMinimized(false);
          }
        }}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '8px 16px',
          color: 'rgba(240, 240, 255, 0.95)',
          fontFamily: 'monospace',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 9999,
        }}
      >
        <span style={{ color: '#ef4444' }}>[{errorCount}]</span>
        <span style={{ color: '#f59e0b', marginLeft: '8px' }}>[{warnCount}]</span>
        <span style={{ marginLeft: '8px' }}>Debug ({logs.length})</span>
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
        background: 'rgba(26, 26, 46, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 9999,
        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }} aria-hidden="true">🔧</span>
          <span style={{ color: 'rgba(240, 240, 255, 0.95)', fontWeight: 600, fontSize: '14px' }}>
            Debug Console
          </span>
          <span style={{ color: 'rgba(240, 240, 255, 0.5)', fontSize: '12px' }}>
            ({logs.length} entries)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => clearLogs()}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: 'rgba(240, 240, 255, 0.7)',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: 'rgba(240, 240, 255, 0.7)',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Min
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? (f === 'ALL' ? 'rgba(255, 255, 255, 0.1)' : levelBgColors[f as LogLevel]) : 'transparent',
              border: `1px solid ${filter === f ? (f === 'ALL' ? 'rgba(255, 255, 255, 0.3)' : levelColors[f as LogLevel]) : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '4px',
              color: filter === f ? (f === 'ALL' ? '#fff' : levelColors[f as LogLevel]) : 'rgba(240, 240, 255, 0.5)',
              padding: '4px 10px',
              fontSize: '11px',
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
              color: 'rgba(240, 240, 255, 0.3)',
              fontSize: '12px',
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
};

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
        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
        cursor: log.data ? 'pointer' : 'default',
        background: log.level === 'ERROR' ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span
          style={{
            color: levelColors[log.level],
            fontWeight: 600,
            fontSize: '11px',
            minWidth: '50px',
          }}
        >
          {log.level}
        </span>
        <span style={{ color: 'rgba(240, 240, 255, 0.4)', fontSize: '11px', minWidth: '70px' }}>
          {formatTime(log.timestamp)}
        </span>
        <span
          style={{
            color: 'rgba(139, 92, 246, 0.8)',
            fontSize: '11px',
            minWidth: '80px',
          }}
        >
          {log.source}
        </span>
        <span style={{ color: 'rgba(240, 240, 255, 0.9)', fontSize: '12px', flex: 1, wordBreak: 'break-word' }}>
          {log.message}
        </span>
        {!!log.data && (
          <span style={{ color: 'rgba(240, 240, 255, 0.4)', fontSize: '10px' }} aria-hidden="true">
            {expanded ? '▼' : '▶'}
          </span>
        )}
      </div>
      {expanded && !!log.data && (
        <pre
          style={{
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            fontSize: '11px',
            color: 'rgba(240, 240, 255, 0.7)',
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
