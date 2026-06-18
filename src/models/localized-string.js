const FALLBACK_LANG = 'eng';

export function fetchLocalizedString(hash, lang, fallback = FALLBACK_LANG) {
  if (hash == null || typeof hash !== 'object') return null;
  const direct = hash[lang] ?? hash[String(lang)];
  if (direct != null) return direct;
  if (fallback != null && fallback !== lang) {
    return hash[fallback] ?? hash[String(fallback)] ?? null;
  }
  return null;
}

export function localizedStringIsEmpty(hash) {
  return hash == null || (typeof hash === 'object' && Object.keys(hash).length === 0);
}

export function localizedStringIsPresent(hash) {
  return !localizedStringIsEmpty(hash);
}
