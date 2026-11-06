import i18n from '../i18n'
import ar from '../locales/bug-report.ar.json'
import en from '../locales/bug-report.en.json'

// The report dialog's strings are their own i18next namespace, "bugReport", imported only by the
// lazy dialog, so they load when someone opens it instead of with every page.
i18n.addResourceBundle('en', 'bugReport', en)
i18n.addResourceBundle('ar', 'bugReport', ar)
