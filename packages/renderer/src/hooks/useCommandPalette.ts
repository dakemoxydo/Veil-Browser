import { useState, useCallback, useEffect } from 'react'
import { useIPC } from './useIPC'

/**
 * useCommandPalette — manages open/close state of the Ctrl+K command palette
 * and binds global keyboard shortcut.
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const { dispatch } = useIPC()

  const open  = useCallback(() => setIsOpen(true),  [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(v => !v), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])

  return { isOpen, open, close, toggle, dispatch }
}
