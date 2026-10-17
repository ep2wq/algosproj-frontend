// The language of a course title, which the API sends without one: "ar" when it contains Arabic
// letters (a translated title), otherwise "en" (English, or Arabic falling back to English).
export function textLang(text: string): 'ar' | 'en' {
  return /[؀-ۿ]/.test(text) ? 'ar' : 'en'
}
