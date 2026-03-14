import { useState, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react'
import { Search, Globe, Clock, Bookmark, Settings, X } from 'lucide-react'
import { useVeilStore } from '../../store/useVeilStore'
import { useIPC } from '../../hooks/useIPC'
import type { SearchResult } from '@veil/shared/state'

const TYPE_ICONS: Record<SearchResult['type'], React.ReactNode> = {
  tab:      <Globe size={14} />,
  history:  <Clock size={14} />,
  bookmark: <Bookmark size={14} />,
  setting:  <Settings size={14} />,
  web:      <Search size={14} />,
}

/**
 * CommandPalette — Ctrl+K overlay for searching tabs, history, bookmarks and settings.
 * Architecture section 9.
 */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchResults = useVeilStore(s => s.searchResults)
  const tabs = useVeilStore(s => s.tabs)
  const activeTabId = useVeilStore(s => s.activeTabId)
  const { dispatch } = useIPC()

  // Debounce search dispatch
  useEffect(() => {
    if (!query.trim()) return
    const timer = setTimeout(() => {
      dispatch({ type: 'SEARCH_QUERY', payload: { q: query, scope: ['tabs', 'history', 'bookmarks', 'settings', 'web'] } })
    }, 150)
    return () => clearTimeout(timer)
  }, [query, dispatch])

  const allResults = useMemo(() => {
    const tabResults: SearchResult[] = query
      ? tabs
          .filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.url.toLowerCase().includes(query.toLowerCase()))
          .map(t => ({ id: t.id, type: 'tab', title: t.title, url: t.url, favicon: t.favicon }))
      : []
    return [...tabResults, ...searchResults.filter(r => r.type !== 'tab')]
  }, [query, tabs, searchResults])

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.type === 'tab') {
      dispatch({ type: 'TAB_FOCUS', payload: { tabId: result.id } })
    } else if (result.url && activeTabId) {
      dispatch({ type: 'TAB_NAVIGATE', payload: { tabId: activeTabId, url: result.url } })
    }
    onClose()
  }, [dispatch, onClose, activeTabId])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') setSelectedIndex(i => Math.min(i + 1, allResults.length - 1))
    if (e.key === 'ArrowUp')   setSelectedIndex(i => Math.max(i - 1, 0))
    if (e.key === 'Enter' && allResults[selectedIndex]) handleSelect(allResults[selectedIndex])
    if (e.key === 'Escape') onClose()
  }, [allResults, selectedIndex, handleSelect, onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '80px',
    }} onClick={onClose}>
      <div
        className="glass-panel"
        onClick={e => e.stopPropagation()}
        style={{ width: '600px', maxHeight: '480px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--veil-glass-border)' }}>
          <Search size={16} color="var(--veil-text-muted)" />
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search tabs, history, bookmarks…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--veil-text-primary)', fontSize: '15px', fontFamily: 'inherit' }}
          />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--veil-text-muted)', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', padding: '6px' }}>
          {allResults.map((result, i) => (
            <div
              key={result.id}
              onClick={() => handleSelect(result)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: i === selectedIndex ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: 'var(--veil-text-primary)',
              }}
            >
              <span style={{ color: 'var(--veil-text-muted)', flexShrink: 0 }}>{TYPE_ICONS[result.type]}</span>
              {result.favicon && <img src={result.favicon} alt="" width={14} height={14} />}
              <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title}</span>
              {result.url && (
                <span style={{ fontSize: '11px', color: 'var(--veil-text-muted)', flexShrink: 0 }}>
                  {new URL(result.url).hostname}
                </span>
              )}
            </div>
          ))}
          {allResults.length === 0 && query && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--veil-text-muted)', fontSize: '13px' }}>
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
