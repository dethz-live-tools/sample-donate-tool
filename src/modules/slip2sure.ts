import type { AppConfig } from './config'
import { isSlipUsed, type D1Binding } from './db'

export type SlipVerifyResult =
  | { ok: true; amount: number; senderName: string; transRef: string; raw: any }
  | { ok: false; status: number; code?: string; error: string }

function digitsOnly(v: string) {
  return String(v || '').replace(/\D/g, '')
}

// ponytail: direct positional mask match for bank/PromptPay/TrueMoney numbers instead of external validator lib
function matchMaskedDigits(masked: string, expected: string): boolean {
  const exp = digitsOnly(expected)
  const cleanMask = String(masked || '')
    .replace(/[^0-9xX*]/g, '')
    .replace(/^(00)?66/, exp.startsWith('0') ? '0' : '66')
  const visible = digitsOnly(cleanMask)
  if (!exp || visible.length < 3 || cleanMask.length > exp.length) return false
  for (let i = 1; i <= cleanMask.length; i++) {
    const mc = cleanMask[cleanMask.length - i]
    if (mc >= '0' && mc <= '9' && mc !== exp[exp.length - i]) return false
  }
  return true
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

  const rawFile = form.get('image')
  if (!rawFile || typeof rawFile === 'string' || !(rawFile instanceof File) || !rawFile.size) {
    return { ok: false, status: 400, error: 'กรุณาแนบรูปสลิป (PNG/JPG)' }
  }
  const file = rawFile as File
  if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return { ok: false, status: 400, error: 'รองรับเฉพาะไฟล์รูปภาพ PNG/JPG ขนาดไม่เกิน 5MB' }
  }
  const upstream = new FormData()
  const safeName = (file.name || 'slip.jpg').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50) || 'slip.jpg'
  upstream.append('image', file, safeName)
  const endpoint =
    type === 'truemoney'
      ? 'https://api.slip2sure.com/api/v0/truemoney/v2/verify'
      : 'https://api.slip2sure.com/api/v0/bank/v0/verifyByFile'
  const s2sRes = await fetch(endpoint, {
    method: 'POST',
    headers: { 'x-api-key': cfg.s2sKey },
    body: upstream
  }).catch(() => null)
  if (!s2sRes) {
    return { ok: false, status: 502, code: 'UPSTREAM_ERROR', error: 'ไม่สามารถเชื่อมต่อระบบตรวจสลิปได้' }
  }

  const s2sData = (await s2sRes.json().catch(() => ({}))) as any
  if (!s2sRes.ok) {
    return {
      ok: false,
      status: s2sRes.status >= 400 && s2sRes.status < 600 ? s2sRes.status : 400,
      code: s2sData?.result || 'ERROR',
      error: s2sData?.message || 'ตรวจสอบสลิปไม่สำเร็จ'
    }
  }

  const info = s2sData.info || {}
  const amount = Number(info.amount || 0)
  if (!Number.isFinite(amount) || amount < 10) {
    return { ok: false, status: 400, code: 'MIN_AMOUNT', error: 'จำนวนเงินโดเนทขั้นต่ำ 10 บาท' }
  }

  if (type === 'truemoney' && cfg.truewalletId) {
    const toMobile = String(info.account_to_mobile || '')
    if (!toMobile || !matchMaskedDigits(toMobile, cfg.truewalletId)) {
      return { ok: false, status: 400, code: 'WRONG_RECEIVER', error: 'เบอร์รับเงิน TrueMoney ไม่ตรงกับระบบ' }
    }
  } else if (type !== 'truemoney' && (cfg.bankAccount || cfg.promptpayId)) {
    const recvAcc = String(info?.receiver?.account?.value || '')
    const recvProxy = String(info?.receiver?.proxy?.value || '')
    const bankOk = cfg.bankAccount
      ? matchMaskedDigits(recvAcc, cfg.bankAccount) || matchMaskedDigits(recvProxy, cfg.bankAccount)
      : false
    const ppOk = cfg.promptpayId
      ? matchMaskedDigits(recvProxy, cfg.promptpayId) || matchMaskedDigits(recvAcc, cfg.promptpayId)
      : false
    if ((!recvAcc && !recvProxy) || (!bankOk && !ppOk)) {
      return { ok: false, status: 400, code: 'WRONG_RECEIVER', error: 'บัญชีหรือพร้อมเพย์ผู้รับไม่ตรงกับระบบ' }
    }
  }

  const refId = String(info.transRef || info.transaction_id || info.payload || '').trim()
  if (!refId) {
    return { ok: false, status: 400, code: 'INVALID_SLIP', error: 'ไม่พบรหัสอ้างอิงสลิป' }
  }
  if (s2sData.is_exist || (await isSlipUsed(db, refId))) {
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
