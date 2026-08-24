import { clampPercent } from '@/lib/date'

export default function ProgressBar({ label, value }: { label: string; value: number }) {
  const safe = clampPercent(value)
  return <div className="progress-block">
    <div className="progress-head"><span>{label}</span><strong>{safe.toLocaleString('fr-FR')}%</strong></div>
    <div className="progress-track"><div className="progress-fill" style={{ width: `${safe}%` }} /></div>
  </div>
}
