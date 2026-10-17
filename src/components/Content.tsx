import type { ReactNode } from 'react'
import { textLang } from '../textLang'

// Text that comes from the course content: lesson bodies, lesson and problem titles, problem
// descriptions, module and topic titles. lang is the language the text is in: lesson bodies and
// problem descriptions pass the body_lang / description_lang the API returns; titles pass "auto"
// (the API sends no language for them), which picks lang from the text and uses dir="auto".
// "ar" gives dir="rtl", "en" dir="ltr", so screen readers switch voice and the text keeps its
// own direction inside either page.
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
  const auto = lang === 'auto'
  const resolved = auto ? textLang(typeof children === 'string' ? children : '') : lang
  return (
    <Tag lang={resolved} dir={auto ? 'auto' : resolved === 'ar' ? 'rtl' : 'ltr'} id={id} className={className}>
      {children}
    </Tag>
  )
}
