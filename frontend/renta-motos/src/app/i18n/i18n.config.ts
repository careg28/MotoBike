export const SUPPORTED_LANGS = ['es', 'en', 'de'] as const;

export type LangCode = typeof SUPPORTED_LANGS[number];

export const DEFAULT_LANG: LangCode = 'es';

export function isLang(v: unknown): v is LangCode {
  return typeof v === 'string'
    && (SUPPORTED_LANGS as readonly string[]).includes(v);
}