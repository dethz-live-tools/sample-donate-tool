import type { AppConfig } from './config'
import { isSlipUsed, type D1Binding } from './db'

export type SlipVerifyResult =
  | { ok: true; amount: number; senderName: string; transRef: string; raw: any }
  | { ok: false; status: number; code?: string; error: string }

function digitsOnly(v: string) {
  return String(v || '').replace(/\D/g, '')
}

// ponytail: direct regex digit match for masked bank/PromptPay/TrueMoney numbers instead of external validator lib
function matchMaskedDigits(masked: string, expected: string): boolean {
  const exp = digitsOnly(expected)
  const msk = digitsOnly(masked)
  if (!exp || !msk) return true
  return exp.endsWith(msk) || msk.endsWith(exp.slice(-4))
}

// ponytail: direct Slip2Sure API fetch instead of slip2sure-js + undici + image-type
export async function verifySlip(
  form: FormData,
  cfg: AppConfig,
  db?: D1Binding
): Promise<SlipVerifyResult> {
  if (!cfg.s2sKey) {
    return { ok: false, status: 400, error: 'Missing SLIP2SURE_API_KEY' }
  }

  const type = String(form.get('type') || 'bank-image')
  if (type === 'truemoney' && !cfg.truewalletId) {
    return { ok: false, status: 400, error: 'ยังไม่เปิดรับช่องทาง TrueMoney' }
  }
  if (type !== 'truemoney' && !cfg.bankAccount && !cfg.promptpayId) {
    return { ok: false, status: 400, error: 'ยังไม่เปิดรับช่องทางธนาคาร / PromptPay' }
  }

  const file = form.get('image') as File | null
  if (!file || !file.size) return { ok: false, status: 400, error: 'กรุณาแนบรูปสลิป (PNG/JPG)' }
  const upstream = new FormData()
  upstream.append('image', file, file.name || 'slip.jpg')
  const endpoint =
    type === 'truemoney'
      ? 'https://api.slip2sure.com/api/v0/truemoney/v2/verify'
      : 'https://api.slip2sure.com/api/v0/bank/v0/verifyByFile'
  const s2sRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'x-api-key': cfg.s2sKey },
    body: upstream
  })

  const s2sData = (await s2sRes.json()) as any
  if (!s2sRes.ok) {
    return {
      ok: false,
      status: s2sRes.status,
      code: s2sData?.result || 'ERROR',
      error: s2sData?.message || 'ตรวจสอบสลิปไม่สำเร็จ'
    }
  }

  const info = s2sData.info || {}
  const amount = Number(info.amount || 0)
  if (amount < 10) {
    return { ok: false, status: 400, code: 'MIN_AMOUNT', error: 'จำนวนเงินโดเนทขั้นต่ำ 10 บาท' }
  }

  if (type === 'truemoney' && cfg.truewalletId) {
    const toMobile = String(info.account_to_mobile || '')
    if (toMobile && !matchMaskedDigits(toMobile, cfg.truewalletId)) {
      return { ok: false, status: 400, code: 'WRONG_RECEIVER', error: 'เบอร์รับเงิน TrueMoney ไม่ตรงกับระบบ' }
    }
  } else if (type !== 'truemoney' && (cfg.bankAccount || cfg.promptpayId)) {
    const recvAcc = String(info?.receiver?.account?.value || '')
    const recvProxy = String(info?.receiver?.proxy?.value || '')
    const bankOk = cfg.bankAccount ? matchMaskedDigits(recvAcc || recvProxy, cfg.bankAccount) : false
    const ppOk = cfg.promptpayId ? matchMaskedDigits(recvProxy || recvAcc, cfg.promptpayId) : false
    if ((recvAcc || recvProxy) && !bankOk && !ppOk) {
      return { ok: false, status: 400, code: 'WRONG_RECEIVER', error: 'บัญชีหรือพร้อมเพย์ผู้รับไม่ตรงกับระบบ' }
    }
  }

  const refId = String(info.transRef || info.transaction_id || info.payload || '')
  if (s2sData.is_exist || (refId && (await isSlipUsed(db, refId)))) {
    return { ok: false, status: 400, code: 'DUPLICATE_SLIP', error: 'สลิปนี้ถูกใช้งานไปแล้ว' }
  }

  return {
    ok: true,
    amount,
    senderName: info?.sender?.displayName || info?.account_from_name || 'ผู้สนับสนุน',
    transRef: refId,
    raw: s2sData
  }
}
