export const APP_TIME_ZONE = 'Africa/Douala'

export function localDateISO(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function localDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: APP_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}


export function localTimeHHMMSS(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('hour')}:${get('minute')}:${get('second')}`
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

export function shortTime(value?: string | null) {
  return value ? value.slice(0, 5) : '—'
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10))
}
