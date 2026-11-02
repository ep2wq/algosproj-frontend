import { useTranslation } from 'react-i18next'
import { formatTime } from './format'

// A row's time of day in UTC (14:03:42 UTC), the same days as the day headings and the date
// filters. The local date and time are in the title.
export default function UtcClock({ iso }: { iso: string }) {
  const { t } = useTranslation()
  return (
    <time dateTime={iso} title={t('admin.common.localTime', { time: formatTime(iso) })} className="shrink-0 font-mono text-xs whitespace-nowrap text-muted tabular-nums">
      {new Date(iso).toISOString().slice(11, 19)} <span className="font-sans text-[0.6875rem] tracking-wide">{t('admin.common.utc')}</span>
    </time>
  )
}
