export function GlassLayer() {
  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <div className="glass-panel" style={{ width: '100%', height: '100%', borderRadius: 0, borderWidth: 0 }} />
    </div>
  )
}
