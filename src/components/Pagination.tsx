import { useTranslation } from 'react-i18next'

// Previous / Next for a paginated list, with "Page X of Y".
export default function Pagination({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number
  lastPage: number
  total: number
  onPage: (page: number) => void
}) {
  const { t } = useTranslation()
  const buttonClass =
    'rounded border border-line bg-surface px-3 py-1 text-sm hover:border-muted disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <nav aria-label={t('admin.pagination.label')} className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={buttonClass}>
        {t('admin.pagination.previous')}
      </button>
      <p className="text-sm text-muted tabular-nums">{t('admin.pagination.pageOf', { page, pages: Math.max(lastPage, 1), total })}</p>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= lastPage} className={buttonClass}>
        {t('admin.pagination.next')}
      </button>
    </nav>
  )
}
