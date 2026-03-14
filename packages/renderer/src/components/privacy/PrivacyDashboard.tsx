import { Shield, Zap } from 'lucide-react'
import { useVeilStore } from '../../store/useVeilStore'

/**
 * PrivacyDashboard — shows on the new tab page or as a sidebar panel.
 * Displays session-wide blocked tracker/ad counts.
 */
export function PrivacyDashboard() {
  const privacyStats = useVeilStore(s => s.privacyStats)

  return (
    <div className="glass-panel" style={{ padding: '20px', maxWidth: '340px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Shield size={20} color="var(--veil-accent)" />
        <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--veil-text-primary)', fontWeight: 600 }}>
          Privacy Shield
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <StatCard
          label="Blocked Total"
          value={privacyStats.totalBlocked}
          icon={<Zap size={16} color="var(--veil-accent)" />}
        />
        <StatCard
          label="Trackers"
          value={privacyStats.trackersBlocked}
          icon={<Shield size={16} color="var(--veil-danger)" />}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '12px',
      padding: '14px',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--veil-text-primary)' }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--veil-text-muted)', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  )
}
