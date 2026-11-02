import type { D1Binding } from './db'

export type AppConfig = {
  s2sKey: string
  geminiKey: string
  ttsEnabled: boolean
  bankName: string
  bankAccount: string
  accountName: string
  promptpayId: string
  truewalletId: string
  turnstileSiteKey: string
  turnstileSecret: string
}

export type Bindings = {
  DB?: D1Binding
  SESSION_SECRET?: string
  SLIP2SURE_API_KEY?: string
  VITE_SLIP2SURE_API_KEY?: string
  GEMINI_API_KEY?: string
  VITE_GEMINI_API_KEY?: string
  TTS_ENABLED?: string
  VITE_TTS_ENABLED?: string
  BANK_NAME?: string
  VITE_BANK_NAME?: string
  BANK_ACCOUNT?: string
  VITE_BANK_ACCOUNT?: string
  ACCOUNT_NAME?: string
  VITE_ACCOUNT_NAME?: string
  PROMPTPAY_ID?: string
  VITE_PROMPTPAY_ID?: string
  TRUEWALLET_ID?: string
  VITE_TRUEWALLET_ID?: string
  TURNSTILE_SITE_KEY?: string
  VITE_TURNSTILE_SITE_KEY?: string
  TURNSTILE_SECRET_KEY?: string
  VITE_TURNSTILE_SECRET_KEY?: string
}

export function getConfig(env?: Bindings): AppConfig {
  const meta = (import.meta as any).env || {}
  const pickPublic = (k1: keyof Bindings, k2: keyof Bindings) =>
    String(env?.[k1] || env?.[k2] || meta[k2] || meta[k1] || '').trim()
  const pickSecret = (k1: keyof Bindings, k2: keyof Bindings) =>
    String(env?.[k1] || env?.[k2] || meta[k1] || '').trim()
  const rawTts = pickPublic('TTS_ENABLED', 'VITE_TTS_ENABLED').toLowerCase()

  return {
    s2sKey: pickSecret('SLIP2SURE_API_KEY', 'VITE_SLIP2SURE_API_KEY'),
    geminiKey: pickSecret('GEMINI_API_KEY', 'VITE_GEMINI_API_KEY'),
    ttsEnabled: !['false', '0', 'off', 'no'].includes(rawTts),
    bankName: pickPublic('BANK_NAME', 'VITE_BANK_NAME'),
    bankAccount: pickPublic('BANK_ACCOUNT', 'VITE_BANK_ACCOUNT'),
    accountName: pickPublic('ACCOUNT_NAME', 'VITE_ACCOUNT_NAME'),
    promptpayId: pickPublic('PROMPTPAY_ID', 'VITE_PROMPTPAY_ID'),
    truewalletId: pickPublic('TRUEWALLET_ID', 'VITE_TRUEWALLET_ID'),
    turnstileSiteKey: pickPublic('TURNSTILE_SITE_KEY', 'VITE_TURNSTILE_SITE_KEY'),
    turnstileSecret: pickSecret('TURNSTILE_SECRET_KEY', 'VITE_TURNSTILE_SECRET_KEY')
  }
}
