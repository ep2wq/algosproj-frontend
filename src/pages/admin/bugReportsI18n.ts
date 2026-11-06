import i18n from '../../i18n'
import strings from '../../locales/admin-bug-reports.en.json'

// The Bug reports admin strings (English only, like all admin text) come with the admin chunk
// instead of with every page. The admin area's English instance shares this resource store.
i18n.addResourceBundle('en', 'translation', strings, true, false)
