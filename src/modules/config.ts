import type { D1Binding } from './db'

export type AppConfig = {
  s2sKey: string
  geminiKey: string
  bankName: string
  bankAccount: string
  accountName: string
  promptpayId: string
  truewalletId: string
}

export type Bindings = {
  DB?: D1Binding
  SLIP2SURE_API_KEY?: string
  VITE_SLIP2SURE_API_KEY?: string
  GEMINI_API_KEY?: string
  VITE_GEMINI_API_KEY?: string
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
}

export function getConfig(env?: Bindings): AppConfig {
  const meta = (import.meta as any).env || {}
  const pick = (k1: keyof Bindings, k2: keyof Bindings) =>
    String(env?.[k1] || env?.[k2] || meta[k2] || meta[k1] || '').trim()

  return {
    s2sKey: pick('SLIP2SURE_API_KEY', 'VITE_SLIP2SURE_API_KEY'),
    geminiKey: pick('GEMINI_API_KEY', 'VITE_GEMINI_API_KEY'),
    bankName: pick('BANK_NAME', 'VITE_BANK_NAME'),
    bankAccount: pick('BANK_ACCOUNT', 'VITE_BANK_ACCOUNT'),
    accountName: pick('ACCOUNT_NAME', 'VITE_ACCOUNT_NAME'),
    promptpayId: pick('PROMPTPAY_ID', 'VITE_PROMPTPAY_ID'),
    truewalletId: pick('TRUEWALLET_ID', 'VITE_TRUEWALLET_ID')
  }
}
