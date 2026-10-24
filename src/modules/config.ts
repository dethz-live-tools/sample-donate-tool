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
  SESSION_SECRET?: string
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
  const pickPublic = (k1: keyof Bindings, k2: keyof Bindings) =>
    String(env?.[k1] || env?.[k2] || meta[k2] || meta[k1] || '').trim()
  const pickSecret = (k1: keyof Bindings, k2: keyof Bindings) =>
    String(env?.[k1] || env?.[k2] || meta[k1] || '').trim()

  return {
    s2sKey: pickSecret('SLIP2SURE_API_KEY', 'VITE_SLIP2SURE_API_KEY'),
    geminiKey: pickSecret('GEMINI_API_KEY', 'VITE_GEMINI_API_KEY'),
    bankName: pickPublic('BANK_NAME', 'VITE_BANK_NAME'),
    bankAccount: pickPublic('BANK_ACCOUNT', 'VITE_BANK_ACCOUNT'),
    accountName: pickPublic('ACCOUNT_NAME', 'VITE_ACCOUNT_NAME'),
    promptpayId: pickPublic('PROMPTPAY_ID', 'VITE_PROMPTPAY_ID'),
    truewalletId: pickPublic('TRUEWALLET_ID', 'VITE_TRUEWALLET_ID')
  }
}
