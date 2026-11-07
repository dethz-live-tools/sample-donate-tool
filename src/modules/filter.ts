// ponytail: zero-dependency profanity word filter for Thai & English
// Integrated dictionaries from https://github.com/obbaeiei/bad-words-thai

export const DEFAULT_THAI_PROFANITY = [
  'เหี้ย', 'สัส', 'ควย', 'เย็ด', 'แม่ง', 'กู', 'มึง', 'ไอ้', 'อีดอก', 'ระยำ',
  'หี', 'แตด', 'ห่า', 'ชิบหาย', 'ฉิบหาย', 'แม่เย็ด', 'พ่อมึงตาย', 'แม่มึงตาย', 'ไอสัตว์', 'อีสัตว์',
  'เชี่ย', 'เชี้ย', 'แม่มึง', 'พ่อมึง', 'ตอแหล', 'ส้นตีน', 'อีห่า', 'อีเหี้ย', 'ไอ้เหี้ย',
  'อีควาย', 'ไอ้ควาย', 'อีชั่ว', 'อีบ้า', 'ไอ้บ้า', 'อีโง่', 'ไอ้โง่', 'อีหน้าด้าน',
  'อีหน้าหี', 'ไอ้หน้าหี', 'อีตัว', 'กระหรี่', 'กะหรี่', 'แรด', 'อีแรด', 'ดอกทอง', 'อีดอกทอง',
  'จัญไร', 'อีจัญไร', 'ขี้', 'ขี้เหร่', 'ขี้โกง', 'ขี้เก๊ก', 'เลว', 'อีเลว', 'สารเลว',
  'หน้าตัวเมีย', 'ตัวเมีย', 'หน้าผี', 'ผีน้อย', 'ไอ้ผี', 'อีผี', 'ทุเรศ', 'อีทุเรศ',
  'เปรต', 'อีเปรต', 'ไอ้เปรต', 'นรก', 'ตกนรก', 'หน้าโง่', 'โง่เง่า',
  'งั่ง', 'ปัญญาอ่อน', 'สมองน้อย', 'ไร้สมอง', 'ควายถึก', 'ควายเถิก', 'กาก',
  'ขยะ', 'ขยะสังคม', 'ลูกหี', 'ลูกหำ', 'ไอ้หำ', 'อีหำ', 'พ่อง', 'น่าเกลียด',
  'สาด', 'สถุล', 'เงี่ยน', 'เสือก', 'ดอ', 'จิ๋ม', 'ดิก', 'เย็ดแม่'
]

export const DEFAULT_THAI_VARIATIONS = [
  'เหี้ยย', 'เหี่ย', 'เฮีย', 'เฮี้ย', 'เหิ่ย', 'เฮิ่ย', 'เหี๋ย', 'เหี๊ย',
  'เหีย', 'เหื่ย', 'เหือ่ย', 'เฮี่ย', 'เฮีย์', 'เฮ้ย', 'เฮียว',
  'เหิ่ยเอ้ย', 'เหี่ยเอ๊ย', 'เฮีย์เอ้ย', 'เหี่ยเอ่ย', 'เหิ่ยย์',
  'เอ้ยเฮิ่ย', 'ไอเหิ่ย', 'ไอเฮีย', 'อีเหิ่ย', 'อีเฮีย',
  'สาส', 'สัด', 'สัสส์', 'ซัส', 'ซาส', 'ส๊าส', 'ส๋าส',
  'สสส', 'สะส', 'สุส', 'สึส', 'สฺส', 'ส@ส', 'ส*ส', 'ส.ั.ส',
  'คอย', 'ค.ว.ย', 'ค_ว_ย', 'กวย', 'กอย', 'ค9ย', 'คw"ย', 'ค๙ย', 'ควยยย', 'ควยๆ',
  'แม้ง', 'แม่งง', 'ม่ง', 'มง',
  'กุ', 'กรู', 'กูู', 'ก.ู', 'กู๋', 'กู๊', 'กu', 'gู', 'กูกู',
  'มุง', 'มึ้ง', 'ม.ึ.ง', 'มรึง', 'มืง', 'มึ่ง', 'muึง',
  'ฮี', 'ฮี่', 'ห.ี', 'หิ',
  'บร้า'
]

export const DEFAULT_THAI_KARAOKE = [
  'hia', 'hea', 'hear', 'heya', 'hiya',
  'sus', 'sas', 'sat', 'sud', 'sut',
  'kuay', 'kuai', 'kwai', 'kway', 'quay', 'quai',
  'yed', 'yet', 'yedd', 'yaed', 'yad',
  'maeng', 'mang', 'meang', 'meng',
  'chibhai', 'shibhai', 'chiphai', 'shiphay',
  'torler', 'torlae', 'tohlae', 'tawlae',
  'sontien', 'sontean', 'santien', 'santean',
  'hum', 'haam', 'hahm'
]

export const DEFAULT_ENGLISH_PROFANITY = [
  'fuck', 'fucking', 'fucker', 'motherfucker', 'fck', 'fuk', 'fuq', 'fvck', 'f*ck', 'f**k', 'f***',
  'shit', 'shitty', 'bullshit', 'sh1t', 'sh!t', '$hit', 'sh*t', 'sh**', 's**t',
  'ass', 'asshole', 'dumbass', 'jackass', '@ss', 'a$$', 'a**', '@$$',
  'bitch', 'bitchy', 'b1tch', 'b!tch', 'b*tch', 'bi+ch',
  'dick', 'dickhead', 'd1ck', 'd!ck', 'd*ck',
  'cock', 'pussy', 'pu$$y', 'p*ssy', 'pu**y',
  'cunt', 'bastard', 'whore', 'slut', 'hoe', 'thot',
  'nigger', 'nigga', 'fag', 'faggot', 'retard', 'retarded',
  'piss', 'crap', 'wank', 'wanker',
  'wtf', 'stfu', 'gtfo', 'kys', 'lmfao'
]

export const SAFE_WORDS_WHITELIST = [
  'สวัสดี', 'สัสดี', 'หีบ', 'หน้าหีบ', 'สมบัติ', 'ตด', 'คอก',
  'อีเมล', 'อีเมล์', 'ไอที', 'ไอคอน', 'ไอดอล', 'ไอเดีย', 'ไอติม', 'ไอแพด', 'ไอโฟน'
]

export const DEFAULT_BLOCKED_WORDS = Array.from(
  new Set([
    ...DEFAULT_THAI_PROFANITY,
    ...DEFAULT_THAI_VARIATIONS,
    ...DEFAULT_THAI_KARAOKE,
    ...DEFAULT_ENGLISH_PROFANITY
  ])
)

export type FilterConfig = {
  enabled: boolean
  words: string // comma or newline separated custom words
  action: 'censor' | 'mute' // censor: replaces with ***, mute: mutes TTS
}

export function parseWordList(rawWords: string): string[] {
  if (!rawWords) return []
  return rawWords
    .split(/[\n,;]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0)
}

export function getAllBlockedWords(customWords = ''): string[] {
  const custom = parseWordList(customWords)
  const set = new Set([...DEFAULT_BLOCKED_WORDS.map((w) => w.toLowerCase()), ...custom])
  // Sort descending by length so longer multi-word phrases match before substrings
  return Array.from(set).sort((a, b) => b.length - a.length)
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildFilterRegex(words: string[]): RegExp | null {
  if (words.length === 0) return null
  const parts = words.map((w) => {
    const escaped = escapeRegex(w)
    // Pure alphanumeric words in Latin alphabet use word boundary matching
    if (/^[a-z0-9]+$/i.test(w)) {
      return `\\b${escaped}\\b`
    }
    return escaped
  })
  return new RegExp(parts.join('|'), 'gi')
}

export type FilterResult = {
  cleanText: string
  speechText: string
  hasProfanity: boolean
  matchedWords: string[]
  shouldMuteTts: boolean
}

export function cleanTtsText(text: string): string {
  return String(text || '')
    .replace(/[*＊]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function filterWordContent(
  text: string,
  config: FilterConfig = { enabled: true, words: '', action: 'censor' },
  replacement = '***'
): FilterResult {
  if (!text || !text.trim() || !config.enabled) {
    const raw = text || ''
    return {
      cleanText: raw,
      speechText: cleanTtsText(raw),
      hasProfanity: false,
      matchedWords: [],
      shouldMuteTts: false
    }
  }

  // 1. Temporarily mask whitelist words to avoid false positives (e.g. สวัสดี, อีเมล)
  let masked = text
  const safeTokens: { token: string; word: string }[] = []
  SAFE_WORDS_WHITELIST.forEach((safeWord, idx) => {
    if (masked.includes(safeWord)) {
      const token = `__SAFE_WORD_${idx}__`
      safeTokens.push({ token, word: safeWord })
      masked = masked.replaceAll(safeWord, token)
    }
  })

  // 2. Perform censorship
  const wordList = getAllBlockedWords(config.words)
  const regex = buildFilterRegex(wordList)
  if (!regex) {
    return {
      cleanText: text,
      speechText: cleanTtsText(text),
      hasProfanity: false,
      matchedWords: [],
      shouldMuteTts: false
    }
  }

  const matchedWords: string[] = []
  let censored = masked.replace(regex, (match) => {
    matchedWords.push(match)
    return replacement
  })

  // 3. Restore masked whitelist words
  for (const { token, word } of safeTokens) {
    censored = censored.replaceAll(token, word)
  }

  const hasProfanity = matchedWords.length > 0
  const shouldMuteTts = hasProfanity && config.action === 'mute'
  const speechText = cleanTtsText(censored)

  return {
    cleanText: censored,
    speechText,
    hasProfanity,
    matchedWords,
    shouldMuteTts
  }
}
