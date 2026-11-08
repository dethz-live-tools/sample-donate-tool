// ponytail: zero-dependency Microsoft Edge TTS client
export const EDGE_TTS_VOICES = [
  { id: 'th-TH-NiwatNeural', name: 'Thai - Niwat (Male)', lang: 'th-TH', gender: 'Male' },
  { id: 'th-TH-PremwadeeNeural', name: 'Thai - Premwadee (Female)', lang: 'th-TH', gender: 'Female' },
  { id: 'en-US-AriaNeural', name: 'English (US) - Aria (Female)', lang: 'en-US', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'English (US) - Guy (Male)', lang: 'en-US', gender: 'Male' },
  { id: 'en-US-JennyNeural', name: 'English (US) - Jenny (Female)', lang: 'en-US', gender: 'Female' },
  { id: 'ja-JP-NanamiNeural', name: 'Japanese - Nanami (Female)', lang: 'ja-JP', gender: 'Female' },
  { id: 'ja-JP-KeitaNeural', name: 'Japanese - Keita (Male)', lang: 'ja-JP', gender: 'Male' }
] as const

export const VOICE_FALLBACKS: Record<string, string> = {
  'th-TH-PremwadeeNeural': 'th-TH-NiwatNeural',
  'th-TH-NiwatNeural': 'th-TH-PremwadeeNeural',
  'en-US-AriaNeural': 'en-US-GuyNeural',
  'en-US-GuyNeural': 'en-US-AriaNeural',
  'ja-JP-NanamiNeural': 'ja-JP-KeitaNeural',
  'ja-JP-KeitaNeural': 'ja-JP-NanamiNeural'
}

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const VERSION_MS_GEC = '1-155.0.4283.45'
const WSS_URL = 'wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1'

export type EdgeTtsOptions = {
  voice?: string
  rate?: string
  pitch?: string
  volume?: string
  timeoutMs?: number
}

export async function generateSecMsGec(trustedClientToken = TRUSTED_TOKEN): Promise<string> {
  const ticks = Math.floor(Date.now() / 1000) + 11644473600
  const rounded = ticks - (ticks % 300)
  const windowsTicks = (BigInt(rounded) * 10000000n).toString()
  const data = new TextEncoder().encode(`${windowsTicks}${trustedClientToken}`)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatRate(rate?: string): string {
  if (!rate) return '+0%'
  const trimmed = rate.trim()
  if (trimmed.endsWith('%')) {
    return trimmed.startsWith('+') || trimmed.startsWith('-') ? trimmed : `+${trimmed}`
  }
  const num = Number(trimmed)
  if (Number.isFinite(num)) {
    return num >= 0 ? `+${num}%` : `${num}%`
  }
  return '+0%'
}

function formatPitch(pitch?: string): string {
  if (!pitch) return '+0Hz'
  const trimmed = pitch.trim()
  if (trimmed.endsWith('Hz')) {
    return trimmed.startsWith('+') || trimmed.startsWith('-') ? trimmed : `+${trimmed}`
  }
  const num = Number(trimmed)
  if (Number.isFinite(num)) {
    return num >= 0 ? `+${num}Hz` : `${num}Hz`
  }
  return '+0Hz'
}

export function buildSSML(text: string, voice = 'th-TH-NiwatNeural', rate = '+0%', pitch = '+0Hz', volume = '+0%'): string {
  const lang = voice.split('-').slice(0, 2).join('-') || 'th-TH'
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}">
  <voice name="${voice}">
    <prosody pitch="${formatPitch(pitch)}" rate="${formatRate(rate)}" volume="${volume || '+0%'}">
      ${escapeXML(text)}
    </prosody>
  </voice>
</speak>`
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk as any)
  }
  return btoa(binary)
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export async function synthesizeEdgeTTS(
  text: string,
  options: EdgeTtsOptions = {}
): Promise<{ audio: Uint8Array; audioBase64: string; sampleRate: number; mimeType: string }> {
  // Strip asterisks/stars so TTS skips pronouncing "ดอกจัน" / "asterisk"
  const cleanSpokenText = String(text || '')
    .replace(/[*＊]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleanSpokenText) {
    return {
      audio: new Uint8Array(0),
      audioBase64: '',
      sampleRate: 24000,
      mimeType: 'audio/mpeg'
    }
  }

  const voice = options.voice || 'th-TH-NiwatNeural'
  const rate = options.rate || '+0%'
  const pitch = options.pitch || '+0Hz'
  const timeoutMs = options.timeoutMs || 10000

  const secMsGec = await generateSecMsGec()
  const connId = crypto.randomUUID().replace(/-/g, '')
  const reqId = crypto.randomUUID().replace(/-/g, '')
  const timestamp = new Date().toISOString()
  const url = `${WSS_URL}?Ocp-Apim-Subscription-Key=${TRUSTED_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${VERSION_MS_GEC}&ConnectionId=${connId}`

  const headers: Record<string, string> = {
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0'
  }

  const format = 'audio-24khz-48kbitrate-mono-mp3'
  const ssml = buildSSML(cleanSpokenText, voice, rate, pitch)
  const cfgMsg =
    `X-Timestamp:${timestamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
    `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":false},"outputFormat":"${format}"}}}}`
  const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}\r\nPath:ssml\r\n\r\n${ssml}`

  const chunks: Uint8Array[] = []

  let ws: any = null

  // 1. Try ws library if available (Node/Vite/Bun dev environment)
  try {
    const wsMod = await import('ws').catch(() => null)
    const NodeWebSocket = wsMod?.default || wsMod?.WebSocket
    if (NodeWebSocket) {
      ws = new NodeWebSocket(url, { headers })
      ws.on?.('error', () => {})
    }
  } catch {}

  // 2. Try Cloudflare Workers fetch upgrade with wss
  if (!ws) {
    try {
      const httpUrl = url.replace(/^wss:\/\//i, 'https://')
      const resp = await fetch(httpUrl, {
        headers: {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
          ...headers
        }
      }).catch(() => null)
      if (resp && (resp as any).webSocket) {
        ws = (resp as any).webSocket
        ws.accept?.()
      }
    } catch {}
  }

  // 3. Fallback to global WebSocket with headers if supported or plain
  if (!ws) {
    try {
      ws = new (globalThis.WebSocket as any)(url, { headers })
    } catch {
      try {
        ws = new globalThis.WebSocket(url)
      } catch {}
    }
  }

  if (!ws) throw new Error('Failed to create WebSocket client')

  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      finish(new Error(`Edge TTS timed out for voice ${voice}`))
    }, timeoutMs)

    function finish(err?: Error) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        if (typeof ws?.removeAllListeners === 'function') {
          ws.removeAllListeners('error')
          ws.on('error', () => {})
        } else if ('onerror' in ws) {
          ws.onerror = () => {}
        }
        ws?.close?.()
      } catch {}
      if (err) {
        reject(err)
      } else {
        const audio = concatChunks(chunks)
        if (audio.length === 0) {
          reject(new Error(`No audio data received for voice ${voice}`))
          return
        }
        const audioBase64 = uint8ArrayToBase64(audio)
        resolve({
          audio,
          audioBase64,
          sampleRate: 24000,
          mimeType: 'audio/mpeg'
        })
      }
    }

    try {
      ws.binaryType = 'arraybuffer'
    } catch {}

    const onOpen = () => {
      try {
        ws?.send(cfgMsg)
        ws?.send(ssmlMsg)
      } catch (err: any) {
        finish(err)
      }
    }

    if (ws.readyState === 1) {
      onOpen()
    }

    const handleMessage = (raw: any, isBinary?: boolean) => {
      let data = raw
      let binary = isBinary
      if (raw && typeof raw === 'object' && 'data' in raw && isBinary === undefined) {
        data = raw.data
      }

      // Plain string
      if (typeof data === 'string') {
        if (data.includes('Path:turn.end')) {
          finish()
        }
        return
      }

      // Explicit non-binary Buffer or ArrayBuffer
      if (binary === false) {
        let text = ''
        if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
          text = new TextDecoder().decode(data)
        } else {
          text = String(data || '')
        }
        if (text.includes('Path:turn.end')) {
          finish()
        }
        return
      }

      // Binary data: ArrayBuffer or TypedArray/Buffer
      let buf: ArrayBuffer | null = null
      let byteOffset = 0
      let byteLength = 0
      if (data instanceof ArrayBuffer) {
        buf = data
        byteOffset = 0
        byteLength = data.byteLength
      } else if (ArrayBuffer.isView(data)) {
        buf = data.buffer
        byteOffset = data.byteOffset
        byteLength = data.byteLength
      }

      if (buf && byteLength >= 2) {
        const view = new DataView(buf, byteOffset, byteLength)
        const headerLen = view.getUint16(0)
        if (headerLen > 0 && byteLength >= 2 + headerLen) {
          const headerStr = new TextDecoder().decode(new Uint8Array(buf, byteOffset + 2, headerLen))
          if (headerStr.includes('Path:audio')) {
            const audioSlice = new Uint8Array(buf, byteOffset + 2 + headerLen, byteLength - 2 - headerLen)
            if (audioSlice.length > 0) {
              chunks.push(new Uint8Array(audioSlice))
            }
            return
          }
        }

        // Check if turn.end arrived as binary/Buffer without isBinary=false
        try {
          const text = new TextDecoder().decode(new Uint8Array(buf, byteOffset, byteLength))
          if (text.includes('Path:turn.end')) {
            finish()
            return
          }
        } catch {}
      }
    }

    const onError = (e: any) => finish(new Error(e?.message || 'WebSocket synthesis error'))
    const onClose = (code?: any, reason?: any) => {
      if (code && typeof code === 'number' && code !== 1000) {
        const reasonStr = reason ? reason.toString() : ''
        finish(new Error(`Edge TTS closed with code ${code}: ${reasonStr}`))
      } else {
        finish()
      }
    }

    if (typeof ws.on === 'function') {
      ws.removeAllListeners?.('error')
      ws.on('open', onOpen)
      ws.on('message', (data: any, isBinary: boolean) => handleMessage(data, isBinary))
      ws.on('error', onError)
      ws.on('close', onClose)
    } else if ('addEventListener' in ws) {
      ws.addEventListener('open', onOpen)
      ws.addEventListener('message', (ev: any) => handleMessage(ev))
      ws.addEventListener('error', onError)
      ws.addEventListener('close', onClose)
    } else {
      ;(ws as any).onopen = onOpen
      ;(ws as any).onmessage = (ev: any) => handleMessage(ev)
      ;(ws as any).onerror = onError
      ;(ws as any).onclose = onClose
    }
  })
}

export async function generateEdgeTTS(
  text: string,
  options: EdgeTtsOptions = {}
): Promise<{ audioBase64?: string; sampleRate: number; mimeType?: string }> {
  if (!text || !text.trim()) return { sampleRate: 24000 }
  const primaryVoice = options.voice || 'th-TH-NiwatNeural'

  try {
    const res = await synthesizeEdgeTTS(text, { ...options, voice: primaryVoice })
    return {
      audioBase64: res.audioBase64,
      sampleRate: res.sampleRate,
      mimeType: res.mimeType
    }
  } catch (err: any) {
    console.warn(`Edge TTS failed for voice ${primaryVoice}:`, err?.message || err)
    const fallbackVoice = VOICE_FALLBACKS[primaryVoice]
    if (fallbackVoice && fallbackVoice !== primaryVoice) {
      try {
        console.log(`Retrying Edge TTS with fallback voice: ${fallbackVoice}`)
        const res = await synthesizeEdgeTTS(text, { ...options, voice: fallbackVoice })
        return {
          audioBase64: res.audioBase64,
          sampleRate: res.sampleRate,
          mimeType: res.mimeType
        }
      } catch (fallbackErr: any) {
        console.error(`Edge TTS fallback ${fallbackVoice} failed:`, fallbackErr?.message || fallbackErr)
      }
    }
    return { sampleRate: 24000 }
  }
}
