import { useState, useCallback, useEffect, type KeyboardEvent } from 'react'
import { useVeilStore } from '../../store/useVeilStore'
import { useIPC } from '../../hooks/useIPC'
import { ArrowLeft, ArrowRight, RotateCw, Lock, Shield } from 'lucide-react'

const NAVIGATION_DEBOUNCE_MS = 150

export function AddressBar() {
  const activeTabId = useVeilStore(s => s.activeTabId)
  const tabs = useVeilStore(s => s.tabs)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const { dispatch } = useIPC()

  const [inputValue, setInputValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  const displayUrl = focused ? inputValue : (activeTab?.url ?? '')

  const handleFocus = useCallback(() => {
    setInputValue(activeTab?.url ?? '')
    setFocused(true)
  }, [activeTab?.url])

  const handleBlur = useCallback(() => {
    setFocused(false)
    setInputValue('')
  }, [])

  const executeNavigation = useCallback((url: string) => {
    if (activeTabId && url) {
      dispatch({ type: 'TAB_NAVIGATE', payload: { tabId: activeTabId, url } })
      setPendingNavigation(null)
    }
  }, [activeTabId, dispatch])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && activeTabId) {
      // Debounce rapid navigations
      if (pendingNavigation) {
        clearTimeout(pendingNavigation as unknown as number)
      }
      const timeoutId = setTimeout(() => {
        executeNavigation(inputValue)
      }, NAVIGATION_DEBOUNCE_MS) as unknown as string
      setPendingNavigation(timeoutId)
      ;(e.target as HTMLInputElement).blur()
    }
    if (e.key === 'Escape') {
      ;(e.target as HTMLInputElement).blur()
    }
  }, [activeTabId, inputValue, pendingNavigation, executeNavigation])

  // Cleanup pending navigation on unmount
  useEffect(() => {
    return () => {
      if (pendingNavigation) {
        clearTimeout(pendingNavigation as unknown as number)
      }
    }
  }, [pendingNavigation])

  const isSecure = activeTab?.url?.startsWith('https://')

  return (
    <div className="no-drag" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px 8px',
    }}>
      {/* Navigation buttons */}
      <button
        onClick={() => activeTabId && dispatch({ type: 'TAB_GO_BACK', payload: { tabId: activeTabId } })}
        disabled={!activeTab?.canGoBack}
        style={{ background: 'transparent', border: 'none', color: activeTab?.canGoBack ? 'var(--veil-text-primary)' : 'var(--veil-text-muted)', cursor: activeTab?.canGoBack ? 'pointer' : 'default', padding: '4px' }}
      >
        <ArrowLeft size={15} />
      </button>
      <button
        onClick={() => activeTabId && dispatch({ type: 'TAB_GO_FORWARD', payload: { tabId: activeTabId } })}
        disabled={!activeTab?.canGoForward}
        style={{ background: 'transparent', border: 'none', color: activeTab?.canGoForward ? 'var(--veil-text-primary)' : 'var(--veil-text-muted)', cursor: activeTab?.canGoForward ? 'pointer' : 'default', padding: '4px' }}
      >
        <ArrowRight size={15} />
      </button>
      <button
        onClick={() => activeTabId && dispatch({ type: 'TAB_RELOAD', payload: { tabId: activeTabId } })}
        style={{ background: 'transparent', border: 'none', color: 'var(--veil-text-muted)', cursor: 'pointer', padding: '4px' }}
      >
        <RotateCw size={14} style={{ animation: activeTab?.isLoading ? 'spin 0.8s linear infinite' : 'none' }} />
      </button>

      {/* URL input */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${focused ? 'rgba(120,180,255,0.4)' : 'var(--veil-glass-border)'}`,
        borderRadius: '10px',
        padding: '5px 10px',
        transition: 'border-color 200ms var(--veil-ease)',
      }}>
        {isSecure ? <Lock size={12} color="var(--veil-accent)" /> : <Shield size={12} color="var(--veil-text-muted)" />}
        <input
          value={displayUrl}
          onChange={e => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search or enter URL"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--veil-text-primary)',
            fontSize: '13px',
            fontFamily: 'inherit',
          }}
        />
      </div>
    </div>
  )
}
