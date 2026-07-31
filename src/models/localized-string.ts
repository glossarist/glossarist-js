const FALLBACK_LANG = 'eng';

export type LocalizedStringHash = Readonly<Record<string, string>>;

export function fetchLocalizedString(
  hash: LocalizedStringHash | null | undefined,
  lang: string,
  fallback: string | null = FALLBACK_LANG,
): string | null {
  if (hash == null || typeof hash !== 'object') return null;
  const direct = hash[lang] ?? hash[String(lang)];
  if (direct != null) return direct;
  if (fallback != null && fallback !== lang) {
    return hash[fallback] ?? hash[String(fallback)] ?? null;
  }
  return null;
}

export function localizedStringIsEmpty(
  hash: LocalizedStringHash | null | undefined,
): boolean {
  return (
    hash == null ||
    (typeof hash === 'object' && Object.keys(hash).length === 0)
  );
}

export function localizedStringIsPresent(
  hash: LocalizedStringHash | null | undefined,
): boolean {
  return !localizedStringIsEmpty(hash);
}
