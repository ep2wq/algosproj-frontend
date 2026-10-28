import { useTranslation } from 'react-i18next'
import { SITE_URL } from '../site'

// The <head> tags of a public page: title, description, canonical link, Open Graph and Twitter
// card. React moves them into <head>; scripts/prerender.mjs writes them into the static HTML.
// The canonical link, og:url and the share image (public/og.png, README "Icons") need SITE_URL
// (VITE_SITE_URL) and are left out without it; the Twitter card is then the small one.
export default function PageMeta({ title, description, path }: { title: string; description: string; path: string }) {
  const { t, i18n } = useTranslation()
  const fullTitle = t('titles.page', { name: title })
  const url = SITE_URL ? SITE_URL + path : null
  const image = SITE_URL ? `${SITE_URL}/og.png` : null

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {url && <link rel="canonical" href={url} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={t('meta.siteName')} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:locale" content={i18n.language === 'ar' ? 'ar_AR' : 'en_US'} />
      {url && <meta property="og:url" content={url} />}
      {image && (
        <>
          <meta property="og:image" content={image} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={t('meta.ogImageAlt')} />
        </>
      )}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </>
  )
}
