// Site-wide values, each in one place. Strings use them as {{product}} and {{email}} (src/i18n.ts
// passes them to every translation), so renaming the product is a change to this line only.
export const PRODUCT_NAME = 'AlgosLab'

// The mailbox (or forwarding) must exist before launch. Used by Contact, FAQ, Terms, Privacy and
// Cookies, always as a mailto link.
export const CONTACT_EMAIL = 'contact@algoslab.sa'

// The public address of the site, without a trailing slash, set as VITE_SITE_URL at build time
// (README "Public pages"). Canonical links, og:url and sitemap.xml need it; without it they are
// left out rather than pointing at a wrong host.
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, '')

// The date the Terms, Privacy and Cookies texts were last changed (YYYY-MM-DD). Change it with the text.
export const LEGAL_UPDATED = '2026-10-26'
