import type { ReactNode } from 'react'

// Text that comes from the course content: lesson bodies, lesson and problem titles, problem
// descriptions, module and topic titles. It is English today, so every caller passes "en";
// later phases pass the language the API returns. "ar" gives dir="rtl", anything else "ltr",
// so screen readers switch voice and the text keeps its own direction inside either page.
export default function Content({
  lang,
  as: Tag = 'span',
  id,
  className,
  children,
}: {
  lang: string
  as?: 'span' | 'div' | 'p'
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Tag lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} id={id} className={className}>
      {children}
    </Tag>
  )
}
