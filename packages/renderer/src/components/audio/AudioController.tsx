import { useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useVeilStore } from '../../store/useVeilStore'
import { useIPC } from '../../hooks/useIPC'

/**
 * AudioController — floating glass pill showing tabs that are currently playing audio.
 * Allows per-tab mute toggle, as specified in architecture section 10.
 */
export function AudioControllerUI() {
  const audioData = useVeilStore(s => s.audioData)
  const tabs = useVeilStore(s => s.tabs)
  const { dispatch } = useIPC()

  // Subscribe to audio updates from main process
  useEffect(() => {
    if (!window.veil?.onAudioUpdate) return
    const unsubscribe = window.veil.onAudioUpdate((data) => {
      useVeilStore.getState().applyPatch({ audioData: data })
    })
    return unsubscribe
  }, [])

  const audibleTabs = audioData.filter(d => d.isAudible)
  if (audibleTabs.length === 0) return null

  return (
    <div className="glass-panel no-drag" style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 100,
      minWidth: '180px',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--veil-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Playing
      </div>
      {audibleTabs.map(d => {
        const tab = tabs.find(t => t.id === d.tabId)
        return (
          <div key={d.tabId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tab?.favicon && <img src={tab.favicon} alt="" width={14} height={14} />}
            <span style={{ flex: 1, fontSize: '12px', color: 'var(--veil-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tab?.title ?? 'Tab'}
            </span>
            <button
              onClick={() => dispatch({ type: 'AUDIO_MUTE', payload: { tabId: d.tabId, muted: !d.isMuted } })}
              style={{ background: 'transparent', border: 'none', color: d.isMuted ? 'var(--veil-danger)' : 'var(--veil-accent)', cursor: 'pointer', padding: '2px' }}
            >
              {d.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        )
      })}
    </div>
  )
}
