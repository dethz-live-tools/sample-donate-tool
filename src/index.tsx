import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { renderer } from './renderer'

type Bindings = {
  SLIP2SURE_API_KEY?: string
  VITE_SLIP2SURE_API_KEY?: string
  GEMINI_API_KEY?: string
  VITE_GEMINI_API_KEY?: string
}

type DonateEvent = {
  id: string
  donor: string
  amount: number
  message: string
  audioBase64?: string
  sampleRate: number
  createdAt: number
}

// ponytail: in-memory state + Set of SSE listeners instead of DB/DO/Redis
const usedSlips = new Set<string>()
const history: DonateEvent[] = []
const listeners = new Set<(ev: DonateEvent) => void>()

const app = new Hono<{ Bindings: Bindings }>()
app.use(renderer)

function getKeys(env: Bindings) {
  const meta = (import.meta as any).env || {}
  return {
    s2sKey: env?.SLIP2SURE_API_KEY || env?.VITE_SLIP2SURE_API_KEY || meta.VITE_SLIP2SURE_API_KEY || '',
    geminiKey: env?.GEMINI_API_KEY || env?.VITE_GEMINI_API_KEY || meta.VITE_GEMINI_API_KEY || ''
  }
}

// ponytail: single fetch to Gemini 2.5 Flash TTS instead of @google/genai SDK
async function generateGeminiTTS(text: string, apiKey: string, voice = 'Kore'): Promise<{ audioBase64?: string; sampleRate: number }> {
  if (!apiKey) return { sampleRate: 24000 }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `พูดขอบคุณโดเนทด้วยน้ำเสียงสดใส: ${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } }
        }
      })
    }
  )
  if (!res.ok) return { sampleRate: 24000 }
  const data = (await res.json()) as any
  const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData
  const rateMatch = part?.mimeType?.match(/rate=(\d+)/)
  return {
    audioBase64: part?.data,
    sampleRate: rateMatch ? Number(rateMatch[1]) : 24000
  }
}

function broadcast(ev: DonateEvent) {
  history.unshift(ev)
  if (history.length > 50) history.pop()
  listeners.forEach((fn) => fn(ev))
}

app.get('/api/events', (c) => {
  return streamSSE(c, async (stream) => {
    const send = (ev: DonateEvent) => {
      stream.writeSSE({ event: 'donate', data: JSON.stringify(ev), id: ev.id })
    }
    listeners.add(send)
    stream.onAbort(() => listeners.delete(send))
    while (true) {
      await stream.writeSSE({ event: 'ping', data: '1' })
      await stream.sleep(15000)
    }
  })
})

app.post('/api/donate', async (c) => {
  const { s2sKey, geminiKey } = getKeys(c.env)
  const form = await c.req.formData()
  const type = String(form.get('type') || 'bank-image')
  const donorInput = String(form.get('donor') || '').trim()
  const message = String(form.get('message') || '').trim()
  const voice = String(form.get('voice') || 'Kore')
  const customGeminiKey = String(form.get('geminiKey') || '').trim() || geminiKey

  if (type === 'test') {
    const donor = donorInput || 'ผู้สนับสนุนใจดี'
    const amount = Number(form.get('amount') || 100)
    const ttsText = `${donor} โดเนท ${amount} บาท ${message}`
    const tts = await generateGeminiTTS(ttsText, customGeminiKey, voice)
    const ev: DonateEvent = {
      id: crypto.randomUUID(),
      donor,
      amount,
      message: message || 'ขอบคุณสำหรับการสนับสนุนครับ!',
      audioBase64: tts.audioBase64,
      sampleRate: tts.sampleRate,
      createdAt: Date.now()
    }
    broadcast(ev)
    return c.json({ ok: true, event: ev })
  }

  if (!s2sKey) {
    return c.json({ ok: false, error: 'Missing SLIP2SURE_API_KEY' }, 400)
  }

  // ponytail: direct Slip2Sure API fetch instead of slip2sure-js + undici + image-type
  let s2sRes: Response
  if (type === 'bank-payload') {
    const payload = String(form.get('payload') || '').trim()
    if (!payload) return c.json({ ok: false, error: 'กรุณากรอก QR Payload' }, 400)
    s2sRes = await fetch('https://api.slip2sure.com/api/v0/bank/v0/verifyByPayload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': s2sKey },
      body: JSON.stringify({ payload })
    })
  } else {
    const file = form.get('image') as File | null
    if (!file || !file.size) return c.json({ ok: false, error: 'กรุณาแนบรูปสลิป (PNG/JPG)' }, 400)
    const upstream = new FormData()
    upstream.append('image', file, file.name || 'slip.jpg')
    const endpoint =
      type === 'truemoney'
        ? 'https://api.slip2sure.com/api/v0/truemoney/v2/verify'
        : 'https://api.slip2sure.com/api/v0/bank/v0/verifyByFile'
    s2sRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'x-api-key': s2sKey },
      body: upstream
    })
  }

  const s2sData = (await s2sRes.json()) as any
  if (!s2sRes.ok) {
    return c.json(
      { ok: false, code: s2sData?.result || 'ERROR', error: s2sData?.message || 'ตรวจสอบสลิปไม่สำเร็จ' },
      s2sRes.status as any
    )
  }

  const info = s2sData.info || {}
  const refId = String(info.transRef || info.transaction_id || info.payload || '')
  if (s2sData.is_exist || (refId && usedSlips.has(refId))) {
    return c.json({ ok: false, code: 'DUPLICATE_SLIP', error: 'สลิปนี้ถูกใช้งานไปแล้ว' }, 400)
  }
  if (refId) usedSlips.add(refId)

  const amount = Number(info.amount || 0)
  const senderName = info?.sender?.displayName || info?.account_from_name || 'ผู้สนับสนุน'
  const donor = donorInput || senderName
  const ttsText = `${donor} โดเนท ${amount} บาท ${message}`
  const tts = await generateGeminiTTS(ttsText, customGeminiKey, voice)

  const ev: DonateEvent = {
    id: crypto.randomUUID(),
    donor,
    amount,
    message,
    audioBase64: tts.audioBase64,
    sampleRate: tts.sampleRate,
    createdAt: Date.now()
  }
  broadcast(ev)
  return c.json({ ok: true, event: ev, slip: s2sData })
})

app.get('/', (c) => {
  return c.render(
    <div class="container">
      <div class="card">
        <div class="nav-links" style="margin-bottom: 0.75rem;">
          <span>Slip2Sure + Gemini TTS</span>
          <a href="/overlay" target="_blank">เปิดหน้า OBS Overlay ↗</a>
        </div>
        <h1>ส่งโดเนทขึ้นจอสตรีม</h1>
        <p class="subtitle">ตรวจสอบสลิปอัตโนมัติผ่าน Slip2Sure API พร้อมเสียงอ่าน Gemini TTS</p>

        <form id="donateForm">
          <div class="row">
            <div>
              <label>ชื่อของคุณ (เว้นว่างใช้ชื่อจากสลิป)</label>
              <input type="text" name="donor" placeholder="เช่น นายสมชาย" />
            </div>
            <div>
              <label>เสียงพากย์ (Gemini Voice)</label>
              <select name="voice">
                <option value="Kore">Kore (หญิง - สดใส)</option>
                <option value="Puck">Puck (ชาย - สนุกสนาน)</option>
                <option value="Zephyr">Zephyr (หญิง - นุ่มนวล)</option>
                <option value="Charon">Charon (ชาย - สุขุม)</option>
                <option value="Aoede">Aoede (หญิง - เป็นธรรมชาติ)</option>
              </select>
            </div>
          </div>

          <label>ช่องทางการตรวจสอบสลิป</label>
          <select name="type" id="slipType">
            <option value="bank-image">สลิปธนาคาร (อัปโหลดรูปภาพ)</option>
            <option value="truemoney">สลิป TrueMoney (อัปโหลดรูปภาพ)</option>
            <option value="bank-payload">สลิปธนาคาร (QR Payload String)</option>
            <option value="test">ทดสอบแจ้งเตือน (ไม่ต้องใช้สลิป)</option>
          </select>

          <div id="fileField">
            <label>แนบรูปสลิป (PNG / JPG)</label>
            <input type="file" name="image" accept="image/png,image/jpeg" />
          </div>

          <div id="payloadField" style="display:none;">
            <label>QR Code Payload</label>
            <input type="text" name="payload" placeholder="004100060000010103..." />
          </div>

          <div id="amountField" style="display:none;">
            <label>จำนวนเงินทดสอบ (บาท)</label>
            <input type="text" name="amount" value="99" />
          </div>

          <label>ข้อความโดเนท (อ่านออกเสียง TTS)</label>
          <textarea name="message" rows={2} placeholder="สู้ๆ ครับสตรีมเมอร์!"></textarea>

          <details style="margin-bottom: 1rem; font-size: 0.8rem; color: #94a3b8;">
            <summary style="cursor: pointer; margin-bottom: 0.5rem;">ตั้งค่า Gemini API Key (ถ้ายังไม่ได้ใส่ใน .env)</summary>
            <input type="text" name="geminiKey" id="geminiKeyInput" placeholder="AIzaSy..." />
          </details>

          <button type="submit" id="submitBtn">ยืนยันและส่งโดเนท</button>
          <div id="statusBox" class="status"></div>
        </form>
      </div>

      <div class="card">
        <label>รายการโดเนทล่าสุด</label>
        <div id="historyList" style="font-size: 0.875rem; color: #94a3b8;">
          {history.length === 0
            ? 'ยังไม่มีรายการโดเนท'
            : history.slice(0, 5).map((h) => (
                <div style="padding: 0.4rem 0; border-bottom: 1px solid #334155;">
                  <strong style="color:#38bdf8">{h.donor}</strong> โดเนท <strong>{h.amount}฿</strong> — {h.message}
                </div>
              ))}
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          const typeSel = document.getElementById('slipType');
          const fileField = document.getElementById('fileField');
          const payloadField = document.getElementById('payloadField');
          const amountField = document.getElementById('amountField');
          const geminiInput = document.getElementById('geminiKeyInput');
          geminiInput.value = localStorage.getItem('gemini_key') || '';
          geminiInput.addEventListener('change', () => localStorage.setItem('gemini_key', geminiInput.value));

          typeSel.addEventListener('change', () => {
            const v = typeSel.value;
            fileField.style.display = (v === 'bank-image' || v === 'truemoney') ? 'block' : 'none';
            payloadField.style.display = v === 'bank-payload' ? 'block' : 'none';
            amountField.style.display = v === 'test' ? 'block' : 'none';
          });

          document.getElementById('donateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            const status = document.getElementById('statusBox');
            btn.disabled = true;
            btn.textContent = 'กำลังตรวจสอบสลิป & สร้างเสียง TTS...';
            status.className = 'status';

            try {
              const fd = new FormData(e.target);
              const res = await fetch('/api/donate', { method: 'POST', body: fd });
              const data = await res.json();
              if (!res.ok || !data.ok) {
                throw new Error((data.code ? '[' + data.code + '] ' : '') + (data.error || 'เกิดข้อผิดพลาด'));
              }
              status.className = 'status ok';
              status.textContent = 'สำเร็จ! แจ้งเตือนโดเนท ' + data.event.amount + ' บาท จาก ' + data.event.donor + ' ส่งไปยัง Overlay แล้ว';
            } catch (err) {
              status.className = 'status err';
              status.textContent = err.message;
            } finally {
              btn.disabled = false;
              btn.textContent = 'ยืนยันและส่งโดเนท';
            }
          });
        `
        }}
      />
    </div>
  )
})

app.get('/overlay', (c) => {
  return c.render(
    <div>
      <button class="unlock-btn" id="unlockBtn">🔊 คลิกเพื่อเปิดเสียง (สำหรับ Browser ปกติ)</button>
      <div class="alert-box" id="alertBox">
        <div class="alert-title">
          <span id="alertDonor"></span> โดเนท <span class="alert-amount" id="alertAmount"></span>!
        </div>
        <div class="alert-msg" id="alertMsg"></div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          document.body.classList.add('overlay-body');
          let audioCtx;
          const queue = [];
          let playing = false;

          function getAudioCtx() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return audioCtx;
          }

          document.getElementById('unlockBtn').addEventListener('click', (e) => {
            getAudioCtx();
            e.target.style.display = 'none';
          });

          // ponytail: decode raw L16 PCM via Web Audio API Float32Array directly without WAV header library
          async function playPCM(base64, sampleRate) {
            const ctx = getAudioCtx();
            const bin = atob(base64);
            const samples = bin.length >> 1;
            const buf = ctx.createBuffer(1, samples, sampleRate || 24000);
            const ch = buf.getChannelData(0);
            const view = new DataView(Uint8Array.from(bin, c => c.charCodeAt(0)).buffer);
            for (let i = 0; i < samples; i++) {
              ch[i] = view.getInt16(i * 2, true) / 32768;
            }
            return new Promise((resolve) => {
              const src = ctx.createBufferSource();
              src.buffer = buf;
              src.connect(ctx.destination);
              src.onended = resolve;
              src.start();
            });
          }

          function playFallbackTTS(text) {
            return new Promise((resolve) => {
              if (!('speechSynthesis' in window)) return setTimeout(resolve, 3000);
              const u = new SpeechSynthesisUtterance(text);
              u.lang = 'th-TH';
              u.onend = resolve;
              u.onerror = resolve;
              speechSynthesis.speak(u);
            });
          }

          async function processQueue() {
            if (playing || queue.length === 0) return;
            playing = true;
            const ev = queue.shift();
            const box = document.getElementById('alertBox');
            document.getElementById('alertDonor').textContent = ev.donor;
            document.getElementById('alertAmount').textContent = ev.amount.toLocaleString() + ' บาท';
            document.getElementById('alertMsg').textContent = ev.message || '';
            box.classList.add('show');

            try {
              if (ev.audioBase64) {
                await playPCM(ev.audioBase64, ev.sampleRate);
              } else {
                await playFallbackTTS(ev.donor + ' โดเนท ' + ev.amount + ' บาท ' + (ev.message || ''));
              }
            } catch (e) {
              console.error(e);
            }

            await new Promise(r => setTimeout(r, 2500));
            box.classList.remove('show');
            await new Promise(r => setTimeout(r, 600));
            playing = false;
            processQueue();
          }

          const es = new EventSource('/api/events');
          es.addEventListener('donate', (e) => {
            queue.push(JSON.parse(e.data));
            processQueue();
          });
        `
        }}
      />
    </div>
  )
})

export default app
